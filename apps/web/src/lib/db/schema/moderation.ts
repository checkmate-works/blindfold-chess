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
 * Rate Limit Key Events — fixed-window counter for non-user-keyed throttling.
 *
 * @description
 * Mirrors `rate_limit_events` but keyed by a string `subject_key` instead of a
 * user UUID. Used for unauthenticated endpoints (sign-in, sign-up, password
 * reset, contact form, email resend) where the limiter key is derived from
 * the client IP (`ip:<ip>`) or a hashed email (`email:<sha256-hex>`).
 *
 * @design Separate table rather than polymorphic column on rate_limit_events
 *
 * `rate_limit_events.user_id` is `uuid NOT NULL` with a foreign key to
 * `auth.users(id) ON DELETE CASCADE`. Repurposing it for a free-form string
 * would require dropping that FK and widening the type. A parallel table is
 * both safer (keeps existing user-keyed limits untouched) and more honest
 * (no FK pretense on keys like `ip:1.2.3.4`).
 *
 * @design No FK, server-side writes only
 *
 * There is no user or auth relation to enforce. The table is written only by
 * server-side Drizzle (pooler role, BYPASSRLS). RLS + FORCE with no policies
 * denies all client access; grants are REVOKEd from `authenticated` / `anon`.
 */
export const rateLimitKeyEvents = pgTable(
  'rate_limit_key_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectKey: varchar('subject_key', { length: 255 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_rate_limit_key_events_lookup').on(table.subjectKey, table.action, table.createdAt),
  ]
);

export type RateLimitKeyEvent = typeof rateLimitKeyEvents.$inferSelect;
export type NewRateLimitKeyEvent = typeof rateLimitKeyEvents.$inferInsert;

/**
 * User Activity Log — immutable event log for user actions.
 *
 * @design Follows the same immutable event log pattern as `moderation_actions`
 *
 * Tracks user-initiated actions (post creation/deletion, likes, follows, blocks,
 * profile edits, logins) for analytics and admin visibility. Append-only — no
 * UPDATE or DELETE RLS policies.
 *
 * @design What earns a row here — prefer events NOT derivable from domain tables
 *
 * The genuine reason this table exists is to preserve facts the domain tables
 * cannot reproduce on their own:
 *   - Toggle-offs: `unlike`, unfollow. `likes` / `userFollows` are current-state
 *     only (no soft delete) — once toggled off, the row is physically gone, so
 *     "user liked then un-liked" survives ONLY here.
 *   - Ephemeral auth events: `logout`, login frequency, `change_password`.
 *     `auth.users` keeps only the latest sign-in; the sequence lives only here.
 * For soft-deleted UGC (games, chunks, posts, repertoires, positions, interview —
 * all carry `deletedAt`), the create/publish/edit/delete actions are fully
 * reconstructable from the entity table itself, so logging them here is REDUNDANT
 * denormalization whose only payoff is the unified `/admin/activity-log` timeline
 * (one read surface instead of an N-table UNION). That is a legitimate ergonomics
 * choice, not a data-preservation need — decide per action which one you're buying.
 * Note also: `logActivityEvent` is fire-and-forget (errors swallowed), so this is
 * NOT a trustworthy audit trail. Moderator-actor auditing lives in `moderation_actions`.
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
