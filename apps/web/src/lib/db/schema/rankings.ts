// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — challenge rankings.
//
// Score-based ranking surfaces: per-attempt `challenge_results`, the
// materialised per-module `challenge_best_scores`, and the server-run
// `challenge_attempts` that a recorded result comes from. (`chess_openings` and
// `feed_items` moved to `./openings` and `./feed` on 2026-07-04.)
import type { ChallengeAttemptState } from '@blindfold-chess/features/challenge-attempt';
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { createdAtOnly, updatedAtOnly } from './columns';

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
    /** Whole seconds (the client timer's value, rounded by the save action). */
    timeTaken: integer('time_taken').notNull(),
    ...createdAtOnly,
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
    /** Whole seconds (the client timer's value, rounded by the save action). */
    timeTaken: integer('time_taken').notNull(),
    achievedAt: timestamp('achieved_at', { withTimezone: true }).defaultNow().notNull(),
    ...updatedAtOnly,
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

/**
 * Challenge Attempts — one server-run challenge, from start to finish.
 *
 * @description
 * A signed-in player's challenge is played against a row here. Starting a
 * challenge inserts the row with every question generated up front; each
 * answer is graded on the server against the stored question and updates
 * `state`; finishing reads the row and, if the run passes the checks, inserts
 * the `challenge_results` row it links to through `challenge_result_id`.
 *
 * Only the server's direct database connection reads or writes this table.
 * RLS is on with no policy and `anon` / `authenticated` have no grants, so
 * the questions not yet shown to the player never reach a client.
 *
 * @design The server runs the attempt; the client only answers
 *
 * The questions are generated and stored when the attempt starts, every
 * answer is graded as it arrives against server timestamps, and finishing
 * takes nothing but the attempt id. Score, mistakes and time are therefore
 * never taken from the client's word. The rejected alternative — the client
 * sending its whole answer log with a seed at the end — leaves the timings as
 * the client's claim (a log rebuilt after the fact cannot be told apart from a
 * manipulated clock), and handing out the seed lets the client read every
 * question in advance.
 *
 * @design One consumption, decided under a row lock
 *
 * Answering and finishing both read the row with `SELECT … FOR UPDATE` and
 * decide inside that transaction. Concurrent or resent requests are therefore
 * serialised: a resend of the previous answer gets the same response again,
 * a different answer for an already-answered question is rejected (no swapping
 * an answer after seeing the result), and once `consumed_at` is set every
 * further finish request gets the outcome stored on the row (`outcome`,
 * `challenge_result_id`) instead of being decided — or recorded — a second
 * time. A response lost in transit can always be retried safely.
 *
 * @design `rules_version` — which rules a row was played under
 *
 * Question generation, the clock rules and the tolerances may change. Each
 * row keeps the version it was played under (`CHALLENGE_RULES_VERSION` at
 * start), so a stored state, thinking time or refusal can be read under the
 * rules that produced it rather than reinterpreted under later ones.
 *
 * @design Retention
 *
 * A daily job (`drizzle/supabase/scheduled_jobs.sql`) deletes rows never
 * finished a day after they started, and 90 days after a row was consumed it
 * empties `questions` and the per-answer log in `state` while keeping the row
 * (and the link to its result).
 *
 * `user_id` references `auth.users` with ON DELETE CASCADE — FK defined in
 * custom SQL.
 */
export const challengeAttempts = pgTable(
  'challenge_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    menuType: varchar('menu_type', { length: 30 }).notNull(),
    leaderboardKey: varchar('leaderboard_key', { length: 20 }).notNull(),
    rulesVersion: integer('rules_version').notNull(),
    /** The settings as returned by the module's `parseSettings`. */
    settings: jsonb('settings').notNull(),
    /** Every question of the attempt, generated at start and never changed. */
    questions: jsonb('questions').$type<unknown[]>().notNull(),
    state: jsonb('state').$type<ChallengeAttemptState>().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    /** `recorded` | `unrecorded` | `implausible_speed`; null until consumed. */
    outcome: varchar('outcome', { length: 30 }),
    /**
     * The result this attempt recorded. SET NULL when that result is deleted
     * (a record removed by moderation, say), so a resent finish never hands
     * out the id of a result that no longer exists: a `recorded` row with no
     * result id answers `rejected` instead.
     */
    challengeResultId: uuid('challenge_result_id').references(() => challengeResults.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [index('idx_ca_user_started').on(table.userId, table.startedAt)]
);

export type ChallengeAttempt = typeof challengeAttempts.$inferSelect;
export type NewChallengeAttempt = typeof challengeAttempts.$inferInsert;
