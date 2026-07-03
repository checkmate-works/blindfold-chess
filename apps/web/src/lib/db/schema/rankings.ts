// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — challenge rankings.
//
// Score-based ranking surfaces: per-attempt `challenge_results` and the
// materialised per-module `challenge_best_scores`. (`chess_openings` and
// `feed_items` moved to `./openings` and `./feed` on 2026-07-04.)
import { index, integer, pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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
 * Challenge Results — stores all challenge results for period-based rankings.
 *
 * @description
 * Every completed challenge session inserts a row here. This table serves as
 * the source of truth for weekly/monthly rankings (queried with `created_at`
 * filters using `DISTINCT ON` to extract each user's best score per period).
 * All-time rankings are served from `challenge_best_scores` instead.
 *
 * This table also replaces the former `practice_sessions` table — challenge
 * results are now stored directly here instead of in a separate sessions table.
 *
 * @design Two-table architecture (Monkeytype-inspired)
 *
 * Challenge data is split into two tables with different responsibilities:
 * - `challenge_results`: append-only log of all challenge results (INSERT only).
 *   Used for weekly/monthly rankings via `created_at` filtering, and also
 *   serves as the source for per-user history (mypage dashboard).
 * - `challenge_best_scores`: materialized all-time best per user/menu/key,
 *   maintained via UPSERT on each new best score.
 *
 * This avoids expensive full-table scans for all-time rankings while keeping
 * period-based rankings simple (the period's data volume is naturally bounded).
 *
 * @design leaderboardKey — segment key (Monkeytype's `mode2` pattern)
 *
 * A finite, enum-like varchar that segments rankings within a menuType.
 * Each module defines its own key values:
 * - coordinate_quiz: 'white' | 'black' | 'random' (boardOrientation)
 * - legal_moves: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'random' (selectedPiece)
 * - square_colors: 'default'
 *
 * timeLimit is NOT included because it is fixed per module. New modules can
 * define their own key values without schema changes.
 *
 * @design Ranking criteria: score DESC, incorrect_answers ASC, time_taken ASC
 *
 * Three-tier tiebreaker: highest score wins; on tie, fewer mistakes wins;
 * on further tie, faster time wins. The UPSERT comparison in
 * `challenge_best_scores` uses the same ordering via tuple comparison.
 *
 * @design Index sort order — manual DESC/ASC in migration SQL
 *
 * Drizzle ORM's `index().on()` does not support DESC/ASC modifiers, so the
 * snapshot JSON records all columns as ASC. The actual migration SQL has been
 * manually edited to specify the correct sort directions. When modifying these
 * indexes in the future, the migration SQL must be manually adjusted again.
 */
export const challengeResults = pgTable(
  'challenge_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    menuType: varchar('menu_type', { length: 30 }).notNull(),
    leaderboardKey: varchar('leaderboard_key', { length: 20 }).notNull(),
    score: integer('score').notNull(),
    incorrectAnswers: integer('incorrect_answers').notNull().default(0),
    timeTaken: integer('time_taken').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_cr_period_ranking').on(
      table.menuType,
      table.leaderboardKey,
      table.createdAt,
      table.score,
      table.incorrectAnswers,
      table.timeTaken
    ),
    index('idx_cr_user').on(table.userId, table.menuType),
  ]
);

export type ChallengeResult = typeof challengeResults.$inferSelect;
export type NewChallengeResult = typeof challengeResults.$inferInsert;

/**
 * Challenge Best Scores — all-time best score per user/menu/key combination.
 *
 * @description
 * Maintains exactly one row per (userId, menuType, leaderboardKey) combination,
 * representing the user's all-time best score. Updated via UPSERT: on each
 * challenge completion, the new score is compared with the stored best using
 * tuple comparison `(score, -incorrect_answers, -time_taken)`, and the row is
 * updated only if the new result is strictly better.
 *
 * @design UPSERT with tuple comparison for atomicity
 *
 * ```sql
 * INSERT INTO challenge_best_scores (...) VALUES (...)
 * ON CONFLICT (user_id, menu_type, leaderboard_key)
 * DO UPDATE SET ...
 * WHERE (EXCLUDED.score, -EXCLUDED.incorrect_answers, -EXCLUDED.time_taken)
 *     > (challenge_best_scores.score, -challenge_best_scores.incorrect_answers,
 *        -challenge_best_scores.time_taken);
 * ```
 *
 * PostgreSQL's row-level locking on `ON CONFLICT DO UPDATE` guarantees atomicity
 * even under concurrent UPSERTs for the same user/menu/key combination.
 *
 * @design Rebuildable from challenge_results
 *
 * This table is a materialized cache. If data correction is needed (e.g.,
 * cheater removal), the best score can be recalculated from `challenge_results`
 * using `DISTINCT ON (user_id, menu_type, leaderboard_key)`.
 */
export const challengeBestScores = pgTable(
  'challenge_best_scores',
  {
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    menuType: varchar('menu_type', { length: 30 }).notNull(),
    leaderboardKey: varchar('leaderboard_key', { length: 20 }).notNull(),
    score: integer('score').notNull(),
    incorrectAnswers: integer('incorrect_answers').notNull().default(0),
    timeTaken: integer('time_taken').notNull(),
    achievedAt: timestamp('achieved_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.menuType, table.leaderboardKey] }),
    index('idx_cbs_ranking').on(
      table.menuType,
      table.leaderboardKey,
      table.score,
      table.incorrectAnswers,
      table.timeTaken
    ),
  ]
);

export type ChallengeBestScore = typeof challengeBestScores.$inferSelect;
export type NewChallengeBestScore = typeof challengeBestScores.$inferInsert;
