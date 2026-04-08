import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from './index';
import { challengeBestScores, challengeResults, profiles } from './schema';

export type LeaderboardRow = {
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

export type LeaderboardPage = {
  rows: LeaderboardRow[];
  total: number;
};

export type RankResult = {
  rank: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday-based week
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff)
  );
  return monday;
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
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
        username: profiles.username,
        score: challengeBestScores.score,
        incorrectAnswers: challengeBestScores.incorrectAnswers,
        timeTaken: challengeBestScores.timeTaken,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        country: profiles.country,
        flair: profiles.flair,
      })
      .from(challengeBestScores)
      .innerJoin(profiles, eq(challengeBestScores.userId, profiles.id))
      .where(
        and(
          eq(challengeBestScores.menuType, menuType),
          eq(challengeBestScores.leaderboardKey, leaderboardKey)
        )
      )
      .orderBy(
        desc(challengeBestScores.score),
        asc(challengeBestScores.incorrectAnswers),
        asc(challengeBestScores.timeTaken)
      )
      .offset(offset)
      .limit(limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(challengeBestScores)
      .where(
        and(
          eq(challengeBestScores.menuType, menuType),
          eq(challengeBestScores.leaderboardKey, leaderboardKey)
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
  const bestPerUser = db
    .selectDistinctOn([challengeResults.userId], {
      userId: challengeResults.userId,
      score: challengeResults.score,
      incorrectAnswers: challengeResults.incorrectAnswers,
      timeTaken: challengeResults.timeTaken,
    })
    .from(challengeResults)
    .where(
      and(
        eq(challengeResults.menuType, menuType),
        eq(challengeResults.leaderboardKey, leaderboardKey),
        gte(challengeResults.createdAt, periodStart)
      )
    )
    .orderBy(
      challengeResults.userId,
      desc(challengeResults.score),
      asc(challengeResults.incorrectAnswers),
      asc(challengeResults.timeTaken)
    )
    .as('best_per_user');

  const rows = await db
    .select({
      userId: bestPerUser.userId,
      username: profiles.username,
      score: bestPerUser.score,
      incorrectAnswers: bestPerUser.incorrectAnswers,
      timeTaken: bestPerUser.timeTaken,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      country: profiles.country,
      flair: profiles.flair,
    })
    .from(bestPerUser)
    .innerJoin(profiles, eq(bestPerUser.userId, profiles.id))
    .orderBy(desc(bestPerUser.score), asc(bestPerUser.incorrectAnswers), asc(bestPerUser.timeTaken))
    .offset(offset)
    .limit(limit);

  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(bestPerUser);

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
  const exec = executor ?? db;
  const [row] = await exec.execute<{ rank: number }>(sql`
    SELECT rank::int FROM (
      SELECT
        user_id,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, incorrect_answers ASC, time_taken ASC
        ) AS rank
      FROM challenge_best_scores
      WHERE menu_type = ${menuType}
        AND leaderboard_key = ${leaderboardKey}
    ) ranked
    WHERE user_id = ${userId}
  `);

  return row ? { rank: row.rank } : null;
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
  const [row] = await db.execute<{ rank: number }>(sql`
    WITH best_per_user AS (
      SELECT DISTINCT ON (user_id)
        user_id, score, incorrect_answers, time_taken
      FROM challenge_results
      WHERE menu_type = ${menuType}
        AND leaderboard_key = ${leaderboardKey}
        AND created_at >= ${periodStart.toISOString()}
      ORDER BY user_id, score DESC, incorrect_answers ASC, time_taken ASC
    )
    SELECT rank::int FROM (
      SELECT
        user_id,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, incorrect_answers ASC, time_taken ASC
        ) AS rank
      FROM best_per_user
    ) ranked
    WHERE user_id = ${userId}
  `);

  return row ? { rank: row.rank } : null;
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

export type RankedLeaderboardRow = LeaderboardRow & { rank: number };

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
 * Returns the user's full ranked row in the all-time leaderboard.
 * Includes rank, score data, and profile data for UI display.
 */
export async function getUserAllTimeRankedRow(
  userId: string,
  menuType: string,
  leaderboardKey: string
): Promise<RankedLeaderboardRow | null> {
  const [row] = await db.execute<RawRankedRow>(sql`
    SELECT ranked.user_id, ranked.score, ranked.incorrect_answers,
           ranked.time_taken, ranked.rank::int,
           p.username, p.display_name, p.avatar_url, p.country, p.flair
    FROM (
      SELECT
        user_id, score, incorrect_answers, time_taken,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, incorrect_answers ASC, time_taken ASC
        ) AS rank
      FROM challenge_best_scores
      WHERE menu_type = ${menuType}
        AND leaderboard_key = ${leaderboardKey}
    ) ranked
    INNER JOIN profiles p ON ranked.user_id = p.id
    WHERE ranked.user_id = ${userId}
  `);

  return row ? mapRawRankedRow(row) : null;
}

async function getUserPeriodRankedRow(
  userId: string,
  menuType: string,
  leaderboardKey: string,
  periodStart: Date
): Promise<RankedLeaderboardRow | null> {
  const [row] = await db.execute<RawRankedRow>(sql`
    SELECT ranked.user_id, ranked.score, ranked.incorrect_answers,
           ranked.time_taken, ranked.rank::int,
           p.username, p.display_name, p.avatar_url, p.country, p.flair
    FROM (
      SELECT
        user_id, score, incorrect_answers, time_taken,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, incorrect_answers ASC, time_taken ASC
        ) AS rank
      FROM (
        SELECT DISTINCT ON (user_id)
          user_id, score, incorrect_answers, time_taken
        FROM challenge_results
        WHERE menu_type = ${menuType}
          AND leaderboard_key = ${leaderboardKey}
          AND created_at >= ${periodStart.toISOString()}
        ORDER BY user_id, score DESC, incorrect_answers ASC, time_taken ASC
      ) best
    ) ranked
    INNER JOIN profiles p ON ranked.user_id = p.id
    WHERE ranked.user_id = ${userId}
  `);

  return row ? mapRawRankedRow(row) : null;
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
