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
export const adBanners = pgTable(
  'ad_banners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slot: varchar('slot', { length: 50 }).unique().notNull(),
    href: varchar('href', { length: 2048 }).notNull(),
    imagePath: varchar('image_path', { length: 1024 }).notNull(),
    alt: varchar('alt', { length: 255 }).notNull().default('Advertisement'),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').default(0),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('idx_ad_banners_active').on(table.isActive)]
);

export type AdBannerRecord = typeof adBanners.$inferSelect;
export type NewAdBannerRecord = typeof adBanners.$inferInsert;

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
