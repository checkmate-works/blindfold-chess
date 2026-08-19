// Split from schema/gamification.ts on 2026-07-04. Per-domain
// schema slice — experience points (Exp).
//
// Experience-point economy: per-action `exp_events` (append-only log) and
// per-user totals (`user_exp`, materialized cache).
import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { createdAtOnly, updatedAtOnly } from './columns';

/**
 * Exp Events — append-only log of all Exp grants.
 *
 * @description
 * Records every Exp grant event. This table is the source of truth for
 * Exp history and audit. Append-only: rows are never updated or deleted.
 *
 * @design Two-table architecture (event log + cache)
 *
 * Exp data is split into two tables with different responsibilities:
 * - `exp_events`: append-only log of all Exp grants (INSERT only).
 *   Used for per-user Exp history and auditing.
 * - `user_exp`: materialized cumulative Exp per user, maintained via
 *   service-role-only writes. Serves as the source for leaderboard
 *   rankings and profile display.
 *
 * @design source + source_id for traceability
 *
 * `source` identifies the subsystem that generated the Exp grant
 * (e.g., 'challenge_result'). `source_id` optionally references the
 * originating record's ID for audit trails. Together they enable
 * tracing any Exp grant back to its origin.
 *
 * @design metadata (JSONB) for extensible context
 *
 * Stores grant-specific context (e.g., score details, bonus multipliers)
 * without requiring schema changes. Follows the same pattern as
 * `userAchievements.metadata` and `moderationActions.metadata`.
 *
 * @design FKs for userId managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`, `userRanks.userId`, etc.
 *
 * @design No updatedAt — append-only by design
 *
 * This table is immutable. Once inserted, records are never updated or
 * deleted. `createdAt` serves as the sole timestamp.
 */
export const expEvents = pgTable(
  'exp_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    source: varchar('source', { length: 50 }).notNull(),
    sourceId: uuid('source_id'),
    menuType: varchar('menu_type', { length: 30 }),
    amount: integer('amount').notNull(),
    metadata: jsonb('metadata').default({}),
    ...createdAtOnly,
  },
  (table) => [
    index('idx_exp_events_user_created').on(table.userId, table.createdAt),
    index('idx_exp_events_source').on(table.source, table.sourceId),
    // Idempotency guard: prevents double-granting EXP for the same (source, source_id)
    // on retries. Partial index allows multiple rows with NULL source_id (e.g., future
    // grants not tied to a specific record).
    uniqueIndex('uq_exp_events_source_pair')
      .on(table.source, table.sourceId)
      .where(sql`source_id IS NOT NULL`),
  ]
);

export type ExpEvent = typeof expEvents.$inferSelect;
export type NewExpEvent = typeof expEvents.$inferInsert;

/**
 * User Exp — cumulative Exp cache per user.
 *
 * @description
 * Maintains exactly one row per user, representing the user's total
 * accumulated Exp. Updated via service-role-only writes whenever new
 * Exp is granted. Used for leaderboard rankings and profile display.
 *
 * @design Materialized cache, rebuildable from exp_events
 *
 * This table is a denormalized cache. If data correction is needed,
 * the total can be recalculated from `exp_events` using
 * `SUM(amount) GROUP BY user_id`. Follows the same cache pattern as
 * `challenge_best_scores`.
 *
 * @design Service-role-only writes
 *
 * INSERT and UPDATE are restricted to the service role to ensure
 * consistency. Client-side code cannot directly modify Exp totals.
 * RLS allows SELECT for authenticated and anon (leaderboard display).
 *
 * @design FKs for userId managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`, `userRanks.userId`, etc.
 */
export const userExp = pgTable(
  'user_exp',
  {
    userId: uuid('user_id').primaryKey().notNull(), // references auth.users — FK defined in custom SQL
    totalExp: integer('total_exp').notNull().default(0),
    ...updatedAtOnly,
  },
  (table) => [index('idx_user_exp_total').on(table.totalExp)]
);

export type UserExpRecord = typeof userExp.$inferSelect;
export type NewUserExpRecord = typeof userExp.$inferInsert;
