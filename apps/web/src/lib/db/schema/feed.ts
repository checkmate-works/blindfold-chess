// Split from schema/rankings.ts on 2026-07-04. Per-domain
// schema slice — home feed.
//
// The materialised home-feed `feed_items` queue — a timeline surface,
// unrelated to the challenge-ranking tables it used to share a file with.
import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_feed_items_created').on(table.createdAt),
    index('idx_feed_items_actor').on(table.actorId),
    index('idx_feed_items_entity').on(table.entityType, table.entityId),
  ]
);

export type FeedItem = typeof feedItems.$inferSelect;
export type NewFeedItem = typeof feedItems.$inferInsert;
