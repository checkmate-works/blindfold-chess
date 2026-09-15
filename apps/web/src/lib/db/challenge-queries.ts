import type { SQL } from 'drizzle-orm';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';

import { notHiddenFromLeaderboard } from '@/lib/db/leaderboard-visibility';

import { db } from './index';
import { startOfCurrentMonth, startOfCurrentWeek } from './period-range';
import { AUTHOR_PROFILE_COLUMNS } from './profile-select';
import { challengeBestScores, challengeResults, profiles } from './schema';

type LeaderboardRow = {
  userId: string;
  username: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  flair: string | null;
};

export type RankedLeaderboardRow = LeaderboardRow & { rank: number };

export type LeaderboardPage = {
  rows: RankedLeaderboardRow[];
  total: number;
};

export type RankResult = {
  rank: number;
};

// ---------------------------------------------------------------------------
// Best-score ordering (the tie-break rule shared by every leaderboard read)
// ---------------------------------------------------------------------------

/**
 * The leaderboard tie-break rule: best = highest score, then fewest
 * incorrect answers, then fastest time. Every ranking read in this module —
 * page queries, rank lookups, ranked-row lookups — sorts by exactly this
 * rule. It is stated twice, once for the Drizzle builder queries (this
 * function) and once for the raw-SQL queries (`BEST_SCORE_ORDER_SQL`);
 * a change to the rule must update both.
 */
function byBestScore(cols: {
  score: Parameters<typeof desc>[0];
  incorrectAnswers: Parameters<typeof asc>[0];
  timeTaken: Parameters<typeof asc>[0];
}): SQL[] {
  return [desc(cols.score), asc(cols.incorrectAnswers), asc(cols.timeTaken)];
}

/**
 * Display ordering: the tie-break rule, then `user_id` as an arbitrary but
 * stable last resort. Rows that match on all three ranking columns share a
 * rank (see {@link rankOver}), so nothing in the rule itself separates them
 * and the database may return them in any order — which makes a page's row
 * order jitter between reads and, across a page boundary, lets one tied row
 * repeat on both pages while another is never shown. `user_id` is unique per
 * row in every score source here, so appending it makes the ordering total.
 * It is deliberately NOT part of the ranking rule: it orders tied rows without
 * splitting their rank.
 */
function byBestScoreThenUser(cols: {
  userId: Parameters<typeof asc>[0];
  score: Parameters<typeof desc>[0];
  incorrectAnswers: Parameters<typeof asc>[0];
  timeTaken: Parameters<typeof asc>[0];
}): SQL[] {
  return [...byBestScore(cols), asc(cols.userId)];
}

/** Raw-SQL twin of {@link byBestScore}. */
const BEST_SCORE_ORDER_SQL = sql`score DESC, incorrect_answers ASC, time_taken ASC`;

/**
 * 1-based rank over the tie-break rule, for use in a SELECT list.
 *
 * `RANK()`, not `ROW_NUMBER()`: users who match on score, incorrect answers
 * AND time taken are indistinguishable under the rule, so they share a rank —
 * two players tied for 3rd are both 3rd and the next player is 5th. Under
 * `ROW_NUMBER()` the database handed them consecutive positions in an
 * unspecified order, which let the same user be called 3rd by their own rank
 * lookup (the number quoted in their `challenge_rank_update` feed item) and
 * 4th by the list they were sent to.
 */
const RANK_WINDOW_SQL = sql`RANK() OVER (ORDER BY ${BEST_SCORE_ORDER_SQL})`;

/** Drizzle-builder twin of {@link RANK_WINDOW_SQL}, for a paginated read. */
function rankOver(cols: {
  score: Parameters<typeof desc>[0];
  incorrectAnswers: Parameters<typeof asc>[0];
  timeTaken: Parameters<typeof asc>[0];
}): SQL<number> {
  return sql<number>`cast(rank() over (order by ${sql.join(byBestScore(cols), sql`, `)}) as int)`;
}

/**
 * Derived table of every all-time best score for a menu/key, shaped as
 * `(user_id, score, incorrect_answers, time_taken)` — the score-source
 * contract expected by `lookupRank` / `lookupRankedRow`.
 *
 * Excludes users who opted out via `profiles.hidden_from_leaderboard`. The
 * filter deliberately lives HERE (the score-source layer) rather than in the
 * display queries: rank numbers are derived from this source's rows, so
 * filtering here keeps a visible user's own rank (`lookupRank`)
 * consistent with the public list, and makes a hidden user's rank resolve to
 * null — which also suppresses their `challenge_rank_update` feed items
 * (see `decideChallengeRankFeedItem`).
 */
function allTimeBestScoresSql(menuType: string, leaderboardKey: string): SQL {
  return sql`(
      SELECT b.user_id, b.score, b.incorrect_answers, b.time_taken
      FROM challenge_best_scores b
      JOIN profiles p ON p.id = b.user_id AND NOT p.hidden_from_leaderboard
      WHERE b.menu_type = ${menuType}
        AND b.leaderboard_key = ${leaderboardKey}
    ) all_time_best`;
}

/**
 * Derived table of each user's single best result within a period, same
 * shape as {@link allTimeBestScoresSql} (DISTINCT ON keeps the first row per
 * user under the tie-break ordering; the 1:1 profiles join used for the
 * hidden-from-leaderboard opt-out — see {@link allTimeBestScoresSql} — does
 * not affect that semantics). Raw-SQL twin of the `bestPerUser` Drizzle
 * subquery in `getPeriodRanking`.
 */
function periodBestScoresSql(menuType: string, leaderboardKey: string, periodStart: Date): SQL {
  return sql`(
      SELECT DISTINCT ON (r.user_id)
        r.user_id, r.score, r.incorrect_answers, r.time_taken
      FROM challenge_results r
      JOIN profiles p ON p.id = r.user_id AND NOT p.hidden_from_leaderboard
      WHERE r.menu_type = ${menuType}
        AND r.leaderboard_key = ${leaderboardKey}
        AND r.created_at >= ${periodStart.toISOString()}
      ORDER BY r.user_id, ${BEST_SCORE_ORDER_SQL}
    ) period_best`;
}

// ---------------------------------------------------------------------------
// All-time ranking (from challenge_best_scores)
// ---------------------------------------------------------------------------

export async function getAllTimeRanking(
  menuType: string,
  leaderboardKey: string,
  offset: number,
  limit: number
): Promise<LeaderboardPage> {
  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        userId: challengeBestScores.userId,
        score: challengeBestScores.score,
        incorrectAnswers: challengeBestScores.incorrectAnswers,
        timeTaken: challengeBestScores.timeTaken,
        // Ranked in the database, over the whole board: a window function is
        // evaluated before LIMIT/OFFSET, so page 2 row 1 knows it is 21st (or
        // 20th, if the rows above it include a tie). Numbering the page rows
        // in TS instead cannot see the ties it is paginating over.
        rank: rankOver(challengeBestScores),
        ...AUTHOR_PROFILE_COLUMNS,
        country: profiles.country,
        flair: profiles.flair,
      })
      .from(challengeBestScores)
      .innerJoin(profiles, eq(challengeBestScores.userId, profiles.id))
      .where(
        and(
          eq(challengeBestScores.menuType, menuType),
          eq(challengeBestScores.leaderboardKey, leaderboardKey),
          notHiddenFromLeaderboard()
        )
      )
      .orderBy(...byBestScoreThenUser(challengeBestScores))
      .offset(offset)
      .limit(limit),
    // The count joins profiles for the same hidden-from-leaderboard filter as
    // the rows query — diverging the two desyncs totalCount from the visible
    // rows and produces empty trailing pages.
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(challengeBestScores)
      .innerJoin(profiles, eq(challengeBestScores.userId, profiles.id))
      .where(
        and(
          eq(challengeBestScores.menuType, menuType),
          eq(challengeBestScores.leaderboardKey, leaderboardKey),
          notHiddenFromLeaderboard()
        )
      ),
  ]);

  return { rows, total: countRow?.count ?? 0 };
}

// ---------------------------------------------------------------------------
// Period ranking (from challenge_results with DISTINCT ON)
// ---------------------------------------------------------------------------

async function getPeriodRanking(
  menuType: string,
  leaderboardKey: string,
  periodStart: Date,
  offset: number,
  limit: number
): Promise<LeaderboardPage> {
  // Use a subquery with DISTINCT ON to get each user's best score in the period.
  // Best = highest score, then fewest incorrect answers, then fastest time.
  // The profiles join applies the hidden-from-leaderboard opt-out HERE (not in
  // the outer display query) so the count(*) below inherits the same filter.
  const bestPerUser = db
    .selectDistinctOn([challengeResults.userId], {
      userId: challengeResults.userId,
      score: challengeResults.score,
      incorrectAnswers: challengeResults.incorrectAnswers,
      timeTaken: challengeResults.timeTaken,
    })
    .from(challengeResults)
    .innerJoin(profiles, eq(challengeResults.userId, profiles.id))
    .where(
      and(
        eq(challengeResults.menuType, menuType),
        eq(challengeResults.leaderboardKey, leaderboardKey),
        gte(challengeResults.createdAt, periodStart),
        notHiddenFromLeaderboard()
      )
    )
    .orderBy(challengeResults.userId, ...byBestScore(challengeResults))
    .as('best_per_user');

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        userId: bestPerUser.userId,
        score: bestPerUser.score,
        incorrectAnswers: bestPerUser.incorrectAnswers,
        timeTaken: bestPerUser.timeTaken,
        rank: rankOver(bestPerUser),
        ...AUTHOR_PROFILE_COLUMNS,
        country: profiles.country,
        flair: profiles.flair,
      })
      .from(bestPerUser)
      .innerJoin(profiles, eq(bestPerUser.userId, profiles.id))
      .orderBy(...byBestScoreThenUser(bestPerUser))
      .offset(offset)
      .limit(limit),
    db.select({ count: sql<number>`count(*)::int` }).from(bestPerUser),
  ]);

  return { rows, total: countRow?.count ?? 0 };
}

export async function getWeeklyRanking(
  menuType: string,
  leaderboardKey: string,
  offset: number,
  limit: number
): Promise<LeaderboardPage> {
  return getPeriodRanking(menuType, leaderboardKey, startOfCurrentWeek(), offset, limit);
}

export async function getMonthlyRanking(
  menuType: string,
  leaderboardKey: string,
  offset: number,
  limit: number
): Promise<LeaderboardPage> {
  return getPeriodRanking(menuType, leaderboardKey, startOfCurrentMonth(), offset, limit);
}

// ---------------------------------------------------------------------------
// User's rank
// ---------------------------------------------------------------------------

/**
 * Returns the user's 1-based rank within `scores` (a derived table from
 * {@link allTimeBestScoresSql} or {@link periodBestScoresSql}), or null if
 * the user has no entry there.
 */
async function lookupRank(
  scores: SQL,
  userId: string,
  exec: { execute: typeof db.execute } = db
): Promise<RankResult | null> {
  const [row] = await exec.execute<{ rank: number }>(sql`
    SELECT rank::int FROM (
      SELECT
        user_id,
        ${RANK_WINDOW_SQL} AS rank
      FROM ${scores}
    ) ranked
    WHERE user_id = ${userId}
  `);

  return row ? { rank: row.rank } : null;
}

/**
 * Returns the user's rank in the all-time leaderboard for a given menu/key.
 * Rank is 1-based. Returns null if the user has no entry.
 *
 * An optional `executor` can be passed to run the query within a transaction,
 * ensuring consistency when called after an UPSERT in the same transaction.
 */
export async function getUserAllTimeRank(
  userId: string,
  menuType: string,
  leaderboardKey: string,
  executor?: { execute: typeof db.execute }
): Promise<RankResult | null> {
  return lookupRank(allTimeBestScoresSql(menuType, leaderboardKey), userId, executor ?? db);
}

/**
 * Returns the user's rank in a period-based leaderboard (weekly or monthly).
 * Uses each user's best score within the period.
 * Returns null if the user has no entry in the period.
 */
async function getUserPeriodRank(
  userId: string,
  menuType: string,
  leaderboardKey: string,
  periodStart: Date
): Promise<RankResult | null> {
  return lookupRank(periodBestScoresSql(menuType, leaderboardKey, periodStart), userId);
}

export async function getUserWeeklyRank(
  userId: string,
  menuType: string,
  leaderboardKey: string
): Promise<RankResult | null> {
  return getUserPeriodRank(userId, menuType, leaderboardKey, startOfCurrentWeek());
}

export async function getUserMonthlyRank(
  userId: string,
  menuType: string,
  leaderboardKey: string
): Promise<RankResult | null> {
  return getUserPeriodRank(userId, menuType, leaderboardKey, startOfCurrentMonth());
}

// ---------------------------------------------------------------------------
// User's ranked row (rank + full profile data for "your rank" display)
// ---------------------------------------------------------------------------

type RawRankedRow = {
  user_id: string;
  username: string;
  score: number;
  incorrect_answers: number;
  time_taken: number;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  flair: string | null;
  rank: number;
};

function mapRawRankedRow(row: RawRankedRow): RankedLeaderboardRow {
  return {
    rank: row.rank,
    userId: row.user_id,
    username: row.username,
    score: row.score,
    incorrectAnswers: row.incorrect_answers,
    timeTaken: row.time_taken,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    country: row.country,
    flair: row.flair,
  };
}

/**
 * Returns the user's full ranked row — rank, score data, and profile data
 * for UI display — within `scores` (a derived table from
 * {@link allTimeBestScoresSql} or {@link periodBestScoresSql}).
 */
async function lookupRankedRow(scores: SQL, userId: string): Promise<RankedLeaderboardRow | null> {
  const [row] = await db.execute<RawRankedRow>(sql`
    SELECT ranked.user_id, ranked.score, ranked.incorrect_answers,
           ranked.time_taken, ranked.rank::int,
           p.username, p.display_name, p.avatar_url, p.country, p.flair
    FROM (
      SELECT
        user_id, score, incorrect_answers, time_taken,
        ${RANK_WINDOW_SQL} AS rank
      FROM ${scores}
    ) ranked
    INNER JOIN profiles p ON ranked.user_id = p.id
    WHERE ranked.user_id = ${userId}
  `);

  return row ? mapRawRankedRow(row) : null;
}

/**
 * Returns the user's full ranked row in the all-time leaderboard.
 * Includes rank, score data, and profile data for UI display.
 */
export async function getUserAllTimeRankedRow(
  userId: string,
  menuType: string,
  leaderboardKey: string
): Promise<RankedLeaderboardRow | null> {
  return lookupRankedRow(allTimeBestScoresSql(menuType, leaderboardKey), userId);
}

async function getUserPeriodRankedRow(
  userId: string,
  menuType: string,
  leaderboardKey: string,
  periodStart: Date
): Promise<RankedLeaderboardRow | null> {
  return lookupRankedRow(periodBestScoresSql(menuType, leaderboardKey, periodStart), userId);
}

export async function getUserWeeklyRankedRow(
  userId: string,
  menuType: string,
  leaderboardKey: string
): Promise<RankedLeaderboardRow | null> {
  return getUserPeriodRankedRow(userId, menuType, leaderboardKey, startOfCurrentWeek());
}

export async function getUserMonthlyRankedRow(
  userId: string,
  menuType: string,
  leaderboardKey: string
): Promise<RankedLeaderboardRow | null> {
  return getUserPeriodRankedRow(userId, menuType, leaderboardKey, startOfCurrentMonth());
}
