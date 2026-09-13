'use server';

import { unstable_cache } from 'next/cache';

import { getLevel } from '@blindfold-chess/features/exp';
import { and, asc, desc, eq, gte, sql, sum } from 'drizzle-orm';

import { EXP_LEADERBOARD_CACHE_TAG } from '@/lib/cache-tags';
import { AUTHOR_PROFILE_COLUMNS, db, expEvents, profiles, userExp } from '@/lib/db';
import { notHiddenFromLeaderboard } from '@/lib/db/leaderboard-visibility';
import { startOfCurrentMonth, startOfCurrentWeek } from '@/lib/db/period-range';
import { handleServerActionError } from '@/lib/server-action-error';

import type { LeaderboardPeriod } from '../../_lib/types';

export type ExpLeaderboardRow = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalExp: number;
  level: number;
  rank: number;
};

export type ExpLeaderboardResult = {
  rows: ExpLeaderboardRow[];
};

const REVALIDATE_SECONDS = 60;
const LIMIT = 50;

const EMPTY_RESULT: ExpLeaderboardResult = { rows: [] };

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

type RankableRow = { totalExp: number };

/**
 * Number rows that are already sorted by descending EXP, giving equal totals
 * an equal rank and resuming at the row position after them: 1, 2, 2, 4.
 *
 * EXP is a single number with no tie-break behind it, so ties here are the
 * normal case rather than a rare coincidence — numbering rows by position
 * would show two players holding exactly the same EXP as 4th and 5th, and
 * which of them got 4th would be whatever order the database happened to
 * return. The score boards rank the same way, in SQL (`RANK()` in
 * `@/lib/db/challenge-queries`); this list is capped at {@link LIMIT} rows
 * and already fully materialised, so it numbers them here instead.
 */
function withCompetitionRank<T extends RankableRow>(rows: T[]): Array<T & { rank: number }> {
  let rank = 0;
  let previousExp: number | null = null;

  return rows.map((row, index) => {
    if (row.totalExp !== previousExp) {
      rank = index + 1;
      previousExp = row.totalExp;
    }
    return { ...row, rank };
  });
}

// ---------------------------------------------------------------------------
// All-time ranking (from user_exp)
// ---------------------------------------------------------------------------

const getCachedAllTimeRanking = unstable_cache(
  async (): Promise<ExpLeaderboardRow[]> => {
    const results = await db
      .select({
        userId: userExp.userId,
        totalExp: userExp.totalExp,
        ...AUTHOR_PROFILE_COLUMNS,
      })
      .from(userExp)
      .innerJoin(profiles, eq(profiles.id, userExp.userId))
      .where(notHiddenFromLeaderboard())
      // `username` breaks the ties that `total_exp` alone leaves open, so the
      // order of equally-ranked players is stable between reads instead of
      // being whatever the database returned this time.
      .orderBy(desc(userExp.totalExp), asc(profiles.username))
      .limit(LIMIT);

    return withCompetitionRank(
      results.map((r) => ({
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        totalExp: r.totalExp,
        level: getLevel(r.totalExp),
      }))
    );
  },
  ['exp-leaderboard-ranking', 'all-time'],
  { revalidate: REVALIDATE_SECONDS, tags: [EXP_LEADERBOARD_CACHE_TAG] }
);

// ---------------------------------------------------------------------------
// Period ranking (from exp_events)
// ---------------------------------------------------------------------------

function getCachedPeriodRanking(period: 'weekly' | 'monthly') {
  return unstable_cache(
    async (): Promise<ExpLeaderboardRow[]> => {
      const startDate = period === 'weekly' ? startOfCurrentWeek() : startOfCurrentMonth();

      const totalExpAlias = sql<number>`cast(coalesce(${sum(expEvents.amount)}, 0) as int)`;

      const results = await db
        .select({
          userId: expEvents.userId,
          totalExp: totalExpAlias,
          cumulativeTotalExp: userExp.totalExp,
          ...AUTHOR_PROFILE_COLUMNS,
        })
        .from(expEvents)
        .innerJoin(profiles, eq(profiles.id, expEvents.userId))
        .leftJoin(userExp, eq(userExp.userId, expEvents.userId))
        .where(and(gte(expEvents.createdAt, startDate), notHiddenFromLeaderboard()))
        .groupBy(
          expEvents.userId,
          userExp.totalExp,
          profiles.username,
          profiles.displayName,
          profiles.avatarUrl
        )
        .orderBy(desc(totalExpAlias), asc(profiles.username))
        .limit(LIMIT);

      return withCompetitionRank(
        results.map((r) => ({
          userId: r.userId,
          username: r.username,
          displayName: r.displayName,
          avatarUrl: r.avatarUrl,
          totalExp: r.totalExp,
          level: getLevel(r.cumulativeTotalExp ?? 0),
        }))
      );
    },
    ['exp-leaderboard-ranking', period],
    { revalidate: REVALIDATE_SECONDS, tags: [EXP_LEADERBOARD_CACHE_TAG] }
  )();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getExpLeaderboard(
  period: LeaderboardPeriod = 'all-time'
): Promise<ExpLeaderboardResult> {
  try {
    const rows =
      period === 'all-time'
        ? await getCachedAllTimeRanking()
        : await getCachedPeriodRanking(period);
    return { rows };
  } catch (error) {
    handleServerActionError(error, '[getExpLeaderboard]');
    return EMPTY_RESULT;
  }
}
