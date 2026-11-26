// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — ranks.
//
// Belt-rank progression: the ordered `ranks` definitions (5級 … 初段) and
// per-user achieved ranks. Conceptually adjacent to `achievements` but kept
// separate because rank progression is monotonic and per-user-unique while
// achievements are a flat set.
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { createdAtOnly } from './columns';

/**
 * Ranks — master data for the belt/ranking system (kyu/dan ranking).
 *
 * @description
 * Stores rank definitions for the progression system inspired by martial arts
 * belt rankings. Users progress linearly from 5-kyu through shodan (first dan) to 10-dan.
 * This table is admin-managed master data (read-only for users).
 *
 * @design slug as URL segment and i18n key source
 *
 * `slug` serves as both the URL path segment (e.g., `/ranks/5kyu`) and the
 * base for next-intl translation keys (e.g., `ranks.5kyu.name` → "5th Kyū").
 * Display names are managed in message files, not in the database, keeping i18n
 * consistent with the rest of the application. Follows the same pattern as
 * `articleCategories.slug` and `chessOpenings.slug`.
 *
 * @design Linear progression via `level` integer
 *
 * Each rank has a numeric `level` value (e.g., 5-kyu=10, 4-kyu=20, shodan=110)
 * with gaps between values to allow future insertion of intermediate ranks
 * without renumbering. Unlock logic is simply `target.level > user.currentLevel`.
 * This enables trivial "next rank" queries and progress bar calculations.
 *
 * @design requirements as JSONB, not a normalized table
 *
 * Each rank can have multiple achievement conditions (challenge scores, post counts,
 * like counts, etc.) with heterogeneous schemas. A normalized `rank_requirements`
 * table would require either wide NULL-heavy columns or a polymorphic EAV pattern.
 * JSONB keeps the schema simple for a small, admin-managed dataset (~15 rows).
 * Validation is enforced at the application layer via Zod schemas, not at the DB level.
 *
 * @design No updatedAt — master data changes are infrequent
 *
 * Rank definitions are seeded via migration/script and rarely modified.
 * When changes occur, they are tracked through migration history.
 * Consistent with `articleCategories` which also omits updatedAt.
 *
 * @design color is varchar, not pgEnum
 *
 * Belt colors may expand or change. varchar avoids ALTER TYPE migrations,
 * consistent with the project's established pattern (topicType, action, etc.).
 *
 * @design No currentRankId cache on profiles (YAGNI)
 *
 * The user's current rank can be derived from `user_ranks` via JOIN + MAX(level).
 * With at most ~15 rows per user, this is trivially fast. A materialized cache
 * column on `profiles` (like `bannedAt`) was considered but deferred — it adds
 * complexity (atomicity, RLS write protection, race conditions) without proven
 * need. If profile-page rank display becomes a performance bottleneck, add
 * `profiles.current_rank_id` as a denormalized cache at that point.
 */
export const ranks = pgTable('ranks', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 50 }).unique().notNull(),
  level: integer('level').notNull().unique(),
  color: varchar('color', { length: 20 }),
  requirements: jsonb('requirements').notNull().default([]),
  ...createdAtOnly,
});

export type Rank = typeof ranks.$inferSelect;
export type NewRank = typeof ranks.$inferInsert;

/**
 * User Ranks — immutable achievement history for rank progression.
 *
 * @description
 * Records when a user achieves a rank. Once inserted, records are never
 * updated or deleted — acquired ranks are never revoked, even if rank
 * requirements are later modified (grandfathering principle).
 *
 * @design Immutable, append-only (no updatedAt)
 *
 * This table is INSERT-only by design. The absence of `updatedAt` signals
 * immutability. Corrections (e.g., cheater removal) would be handled via
 * admin moderation actions, not row updates.
 *
 * @design onDelete: 'restrict' — protect history from master data deletion
 *
 * If a rank needs to be retired, it should be handled via logical deletion
 * (adding a deprecatedAt column to ranks) rather than physical deletion.
 * CASCADE would violate the immutability guarantee of achievement records.
 *
 * @design INSERT restricted to service role (Server Action only)
 *
 * Users must not be able to self-insert rank achievements. All rank
 * granting is done server-side after validating achievement conditions.
 * RLS grants SELECT only to authenticated; no INSERT/UPDATE/DELETE policies.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`.
 *
 * @design achievedAt serves as the creation timestamp
 *
 * This table omits the conventional `createdAt` column. `achievedAt` records
 * when the rank was earned, which is always the insertion time (defaultNow()).
 * A separate `createdAt` would be redundant. If backdated rank grants become
 * necessary in the future, `achievedAt` can be set explicitly while adding
 * a `createdAt` column for audit purposes.
 */
export const userRanks = pgTable(
  'user_ranks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    rankId: uuid('rank_id')
      .notNull()
      .references(() => ranks.id, { onDelete: 'restrict' }),
    achievedAt: timestamp('achieved_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_user_rank').on(table.userId, table.rankId),
    index('idx_user_ranks_user').on(table.userId),
  ]
);

export type UserRank = typeof userRanks.$inferSelect;
export type NewUserRank = typeof userRanks.$inferInsert;

/**
 * Dojo Step Completions — the set of dojo steps a user has completed.
 *
 * @description
 * One row per (user, step). A step is named by a string key of one of two
 * shapes: `guide:<rank>:<page>` (the user worked through one page of a rank's
 * guide) and `exam:<rank>:<problem>` (the user passed one exam problem, e.g.
 * `exam:2kyu:puzzle`). The key builders and the shape check live in
 * `@blindfold-chess/features/dojo-journey`, shared with the app.
 *
 * @design One "completed keys" set for both guide pages and exam passes
 *
 * Both facts answer the same question — "has this user done step X?" — so
 * one table holds both. Separate tables for guide progress and exam passes
 * were rejected: they would duplicate the read and write paths for no
 * difference in shape.
 *
 * @design `step_key` is a string, not an enum
 *
 * A new kind of step (another rank's guide, a new exam problem) is a new key,
 * not a schema change, so adding one needs no migration. The CHECK
 * `^[a-z0-9][a-z0-9:_-]{0,63}$` bounds what can be stored (lower-case slugs,
 * digits, `:`, `_`, `-`; at most 64 characters) without listing the kinds.
 *
 * @design Append-only, never revoked
 *
 * A step once done stays done; no code path updates or deletes rows (only the
 * `ON DELETE CASCADE` from `auth.users` when the account is erased). The
 * primary key `(user_id, step_key)` makes every write idempotent through
 * `onConflictDoNothing`, so a client resending its guide pages is harmless.
 *
 * @design Who may write which key
 *
 * Clients may report `guide:` keys only — a "worked on it" mark that grants
 * nothing. `exam:` keys are evidence for a rank (the `exam_problem`
 * requirement reads them), so only the server writes them, after grading the
 * answer itself (`src/lib/dojo/exam.ts`). Accepting a reported `exam:` key
 * would let anyone earn a rank by calling the API directly.
 *
 * @design Writes go through the server's Drizzle connection only
 *
 * `authenticated` gets SELECT on its own rows and nothing else (RLS policy in
 * `drizzle/supabase/rls_policies.sql`, GRANT in `foreign_keys_and_grants.sql`).
 * The FK to `auth.users` is defined in that custom SQL, like `user_ranks`.
 */
export const dojoStepCompletions = pgTable(
  'dojo_step_completions',
  {
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    stepKey: varchar('step_key', { length: 64 }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.stepKey] }),
    check(
      'dojo_step_completions_chk_step_key',
      sql`${table.stepKey} ~ '^[a-z0-9][a-z0-9:_-]{0,63}$'`
    ),
  ]
);

export type DojoStepCompletion = typeof dojoStepCompletions.$inferSelect;
export type NewDojoStepCompletion = typeof dojoStepCompletions.$inferInsert;
