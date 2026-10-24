// Split from schema/rankings.ts on 2026-07-04. Per-domain
// schema slice — home feed.
//
// The materialised home-feed `feed_items` queue — a timeline surface,
// unrelated to the challenge-ranking tables it used to share a file with.
import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { createdAtOnly } from './columns';

/**
 * Feed Items — materialized timeline feed for the home page.
 *
 * @description
 * Stores feed entries for the timeline. Each user action that should appear
 * in the feed (e.g., creating a topic post) inserts a row here. The home page
 * queries this single table with cursor-based pagination for efficient,
 * chronological feed display.
 *
 * @design Materialized feed (not UNION query)
 *
 * A dedicated table optimizes reads (the dominant operation for a timeline).
 * `ORDER BY created_at DESC LIMIT N` on a single indexed table is far more
 * efficient than merging multiple source tables via UNION. It also enables
 * simple cursor-based pagination and future personalization (filtering by
 * followed users via `actor_id`).
 *
 * @design entityType is varchar, not pgEnum
 *
 * New feed item types (likes, follows, achievements, etc.) will be added
 * incrementally. Using varchar avoids requiring an ALTER TYPE migration
 * for each new type.
 *
 * @design metadata (JSONB) for entity-type-specific data
 *
 * Stores supplementary data needed for list display without JOINs
 * (e.g., `{ topicType: 'square', topicKey: 'e4' }` for topic_post items).
 * Detailed data is fetched via JOIN when constructing the full feed response.
 *
 * @design FKs managed in custom SQL
 *
 * `actorId` -> `auth.users` is defined in Supabase-side SQL (not Drizzle
 * references), following the same pattern as `profiles.id`.
 *
 * @design No updatedAt — feed entries are immutable
 *
 * Rows are inserted when the source action happens and deleted if the source
 * entity is removed; they are never updated in place.
 */
export const feedItems = pgTable(
  'feed_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    actorId: uuid('actor_id').notNull(), // references auth.users — FK defined in custom SQL
    metadata: jsonb('metadata').default({}),
    ...createdAtOnly,
  },
  (table) => [
    index('idx_feed_items_created').on(table.createdAt),
    // (actor_id, created_at DESC) — the public profile timeline pages one
    // member's own activity with `WHERE actor_id = ? AND created_at < ?
    // ORDER BY created_at DESC`. The composite covers both the equality and
    // the ordering, so Postgres walks the index instead of sorting every row
    // an actor ever produced. Replaced the actor-only index, which could
    // serve the equality but left the sort to a heap read.
    index('idx_feed_items_actor_created').on(table.actorId, table.createdAt.desc()),
    index('idx_feed_items_entity').on(table.entityType, table.entityId),
  ]
);

export type FeedItem = typeof feedItems.$inferSelect;
export type NewFeedItem = typeof feedItems.$inferInsert;

/**
 * Join Announcement Decisions — each member's answer to the onboarding
 * "announce your arrival on the home feed?" step (`member_joined` feed items,
 * see `@/lib/feed-items/member-joined`).
 *
 * @description
 * One row per member, written once. Its presence means the question is closed:
 * the step is not offered again, even after the member deletes the card or
 * the 30-day reaper removes it — which is exactly when the `feed_items` row
 * can no longer say whether the member was ever asked.
 *
 * @design Its own table, not a column on `profiles`
 * This is onboarding workflow state, not part of the member's public identity,
 * and `profiles` is readable column-for-column by `anon` through PostgREST
 * (its RLS only hides deleted rows). As a profile column, the answer — and,
 * next to a missing card, the fact that someone declined — was public. This
 * table has no client privileges at all; only the server reads it.
 *
 * @design The primary key is the claim
 * `INSERT ... ON CONFLICT DO NOTHING RETURNING` succeeds for exactly one
 * request per member, and only that request posts the card, so a double
 * submit or a second tab cannot post twice.
 *
 * @design `outcome`, including members who were never asked
 * `'announced'` / `'declined'` record the answer. `'not_offered'` marks every
 * member who existed before the feature: the migration that created this table
 * inserted one for each, so a long-standing member who opens
 * `/mypage/onboarding` by URL is not offered a "just joined" card, and the
 * table never claims they declined something they never saw. varchar rather
 * than pgEnum, like `feed_items.entity_type`.
 *
 * @design FK in custom SQL
 * `user_id` → `auth.users` ON DELETE CASCADE, defined in
 * `drizzle/supabase/foreign_keys_and_grants.sql`: the answer means nothing
 * once the account is purged.
 */
export const joinAnnouncementDecisions = pgTable('join_announcement_decisions', {
  userId: uuid('user_id').primaryKey(), // references auth.users — FK defined in custom SQL
  outcome: varchar('outcome', { length: 20 })
    .$type<'announced' | 'declined' | 'not_offered'>()
    .notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }).defaultNow().notNull(),
});

export type JoinAnnouncementDecision = typeof joinAnnouncementDecisions.$inferSelect;
