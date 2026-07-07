// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — notifications.
//
// Ad-banner inventory and in-app notification rows.
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * @design updated_at update policy
 *
 * For every table with an `updated_at` column, the timestamp is refreshed
 * automatically by Drizzle via `.$onUpdateFn(() => new Date())`. When adding a
 * new table that has an `updated_at` column, always attach this callback.
 *
 * Exceptions:
 * - `profiles`: updated by a Supabase BEFORE UPDATE trigger
 *   (`profiles_updated_at`). Because `profiles` can be written through
 *   internal Supabase paths that go via `auth.users` (e.g. auth hooks), the
 *   timestamp update is centralized at the DB trigger layer instead of
 *   `$onUpdateFn`. See the `@design` note on the `profiles` table
 *   definition for details.
 *
 * Existing call sites still contain several explicit
 * `set({ updatedAt: new Date() })` statements. They are redundant but
 * harmless and act as a fail-safe if an UPDATE path that bypasses Drizzle
 * is introduced in the future.
 */
/**
 * Self-served ad inventory ("creatives").
 *
 * @design One table, many creative kinds (discriminator + JSONB payload)
 *
 * A single table backs every self-hosted ad format on the site — the
 * in-feed native card, generic rectangle banners, and whatever comes next.
 * `kind` is the discriminator; format-specific fields live in `payload`
 * (JSONB) instead of a wide grid of mostly-NULL columns. This mirrors the
 * `feed_items.entity_type + data` and `moderation_actions.action + metadata`
 * patterns already used elsewhere: adding a new ad format is a new `kind`
 * value + payload type + type guard + renderer, with no migration. The
 * fields that are genuinely common to every format (`href`, scheduling,
 * `is_active`, `slot`, `sort_order`) stay first-class columns so an
 * "active creatives for this slot right now" query is kind-agnostic.
 *
 * @design `slot` is NOT unique — creatives rotate within a placement
 *
 * `slot` identifies a placement (e.g. `feed-native-ad`, `content-bottom`), and
 * multiple active creatives may share one slot so they can rotate. The
 * (slot → allowed kind) binding is enforced in application code by
 * `AD_SLOTS` in `@/lib/ads/registry` (a DB row cannot express "this slot
 * only accepts native_card"), so writes must validate against that
 * registry. This is deliberately unlike the old `ad_banners.slot` UNIQUE
 * (one-row-per-slot) model it replaced.
 *
 * NOT related to the Google-AdSense display system (`AdSlot`,
 * `ads_hidden` cookie, `AdSlotKind`) — that renders third-party `<ins>`
 * tags and never reads this table. These are first-party creatives we host
 * and link ourselves (affiliate links etc.).
 */
export const adCreatives = pgTable(
  'ad_creatives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Discriminator — see `AdKind` in `@/lib/ads/registry`. */
    kind: varchar('kind', { length: 50 }).notNull(),
    /** Placement identifier — see `AdSlot` in `@/lib/ads/registry`. Not unique. */
    slot: varchar('slot', { length: 50 }).notNull(),
    /** Click destination (affiliate URL etc.), common to every kind. */
    href: varchar('href', { length: 2048 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    /**
     * ISO-3166 alpha-2 country allow-list. NULL / empty = shown everywhere
     * (global). Non-empty = shown only to visitors in those countries. A
     * cross-kind targeting filter (like schedule / is_active), applied
     * in-memory after the cached pool read, keyed by the request's
     * `x-vercel-ip-country`. See `@/lib/ads/country`.
     */
    targetCountries: text('target_countries').array(),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    /** Kind-specific fields — see the `*Payload` types in `@/lib/ads/payload`. */
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('idx_ad_creatives_slot_active').on(table.slot, table.isActive)]
);

export type AdCreativeRecord = typeof adCreatives.$inferSelect;
export type NewAdCreativeRecord = typeof adCreatives.$inferInsert;

// Notifications
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    actorId: uuid('actor_id'),
    type: varchar('type', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }),
    targetId: uuid('target_id'),
    groupKey: varchar('group_key', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user_created').on(table.userId, table.createdAt),
    index('idx_notifications_unread')
      .on(table.userId)
      .where(sql`is_read = false`),
    index('idx_notifications_dedup').on(
      table.userId,
      table.type,
      table.actorId,
      table.targetType,
      table.targetId
    ),
    index('idx_notifications_group_key').on(table.userId, table.groupKey),
    index('idx_notifications_actor').on(table.actorId),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

/**
 * Chess Openings — master data for chess opening families.
 *
 * @description
 * Stores chess opening families (e.g., French Defense, Sicilian Defense) with their
 * representative PGN move sequences and resulting FEN positions. Used as topicKey
 * source for topic_posts with topicType='opening'.
 *
 * @design Master data, not user-generated content
 *
 * This table is seeded via migration/script and managed by admins only.
 * Users cannot create, modify, or delete openings. RLS allows public reads
 * but restricts writes to the service role.
 *
 * @design FEN derived from PGN at seed time
 *
 * The `fen` column stores the board state after executing the `pgn` moves.
 * This is computed at seed time using chess.js (via @blindfold-chess/features/chess-core)
 * to avoid runtime computation.
 *
 * @design slug as topicKey
 *
 * The `slug` column serves as the `topicKey` value when `topicType='opening'`,
 * following the same pattern as other topic types. It appears in URLs
 * (e.g., /topics/openings/french-defense).
 *
 * @design Flat URL slugs — no hierarchical paths
 *
 * Although parentSlug models a tree, URLs remain flat (/openings/kings-gambit-declined,
 * not /openings/kings-gambit/declined). The slug is used as topicKey in topicPosts and
 * as answerValue in userInterviewAnswers; hierarchical paths would require reverse-mapping
 * logic with no SEO or UX benefit. Hierarchy is expressed in the UI (breadcrumbs) instead.
 */
