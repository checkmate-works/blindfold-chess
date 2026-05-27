// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — moderation.
//
// Moderation event log, rate-limit event log, and the broader user activity
// log. The moderation log is append-only (no `updated_at`) — see the table
// TSDoc for the event-sourcing rationale.
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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
export const moderationActions = pgTable(
  'moderation_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').notNull(), // references auth.users — FK defined in custom SQL
    action: varchar('action', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason'),
    metadata: jsonb('metadata').default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_moderation_actions_actor').on(table.actorId),
    index('idx_moderation_actions_target').on(table.targetType, table.targetId),
    index('idx_moderation_actions_action').on(table.action),
    index('idx_moderation_actions_created').on(table.createdAt),
  ]
);

export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;

/**
 * Rate Limit Events — fixed-window counter for user action throttling.
 *
 * @description
 * Records each rate-limited action performed by a user. The `checkRateLimit` function
 * counts events within a time window to decide whether to allow or reject new actions.
 *
 * @design PostgreSQL-based, not Redis (see Issue #18)
 *
 * This project already uses PostgreSQL (Supabase) and has no Redis dependency.
 * Adding Redis solely for rate limiting would increase infrastructure complexity
 * disproportionately to the traffic level of this application. PostgreSQL with
 * proper indexing handles the expected load well.
 *
 * @design No cleanup mechanism (YAGNI)
 *
 * Old events are not automatically deleted. A cleanup job (e.g., pg_cron) can be
 * added later if the table grows to a problematic size.
 */
export const rateLimitEvents = pgTable(
  'rate_limit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_rate_limit_events_lookup').on(table.userId, table.action, table.createdAt)]
);

export type RateLimitEvent = typeof rateLimitEvents.$inferSelect;
export type NewRateLimitEvent = typeof rateLimitEvents.$inferInsert;

/**
 * User Activity Log — immutable event log for user actions.
 *
 * @design Follows the same immutable event log pattern as `moderation_actions`
 *
 * Tracks user-initiated actions (post creation/deletion, likes, follows, blocks,
 * profile edits, logins) for analytics and admin visibility. Append-only — no
 * UPDATE or DELETE RLS policies.
 *
 * @design Polymorphic target_type + target_id
 *
 * Consistent with `moderation_actions` and `topicPosts.topicType + topicKey`.
 * target_type/target_id are optional because some actions (e.g., login, profile edit)
 * don't have an external target entity.
 *
 * @design action is varchar, not pgEnum
 *
 * New action types will be added incrementally. Using varchar avoids requiring
 * an ALTER TYPE migration for each new action.
 *
 * @design metadata (JSONB) for flexible context
 *
 * Stores action-specific data (e.g., topic key for post creation, changed fields
 * for profile edits). Extensible without schema changes.
 *
 * @design No updated_at — activity logs are immutable
 *
 * Records are append-only. No UPDATE or DELETE RLS policies are defined.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`.
 */
export const userActivityLog = pgTable(
  'user_activity_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    action: varchar('action', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_activity_log_user').on(table.userId),
    index('idx_user_activity_log_action').on(table.action),
    index('idx_user_activity_log_target').on(table.targetType, table.targetId),
    index('idx_user_activity_log_created').on(table.createdAt),
  ]
);

export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type NewUserActivityLog = typeof userActivityLog.$inferInsert;

// Ad Banners
