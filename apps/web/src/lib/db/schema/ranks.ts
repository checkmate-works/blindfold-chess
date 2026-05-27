// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — ranks.
//
// Belt-rank progression: the ordered `ranks` definitions (5級 … 初段) and
// per-user achieved ranks. Conceptually adjacent to `achievements` but kept
// separate because rank progression is monotonic and per-user-unique while
// achievements are a flat set.
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
