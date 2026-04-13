'use server';

import { unstable_cache } from 'next/cache';

import { getLevel } from '@blindfold-chess/features/exp';
import { desc, eq, gte, sql, sum } from 'drizzle-orm';

import { EXP_LEADERBOARD_CACHE_TAG } from '@/lib/cache-tags';
import { db, expEvents, profiles, userExp } from '@/lib/db';
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
// All-time ranking (from user_exp)
// ---------------------------------------------------------------------------

const getCachedAllTimeRanking = unstable_cache(
  async (): Promise<ExpLeaderboardRow[]> => {
    const results = await db
      .select({
        userId: userExp.userId,
        totalExp: userExp.totalExp,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(userExp)
      .innerJoin(profiles, eq(profiles.id, userExp.userId))
      .orderBy(desc(userExp.totalExp))
      .limit(LIMIT);

    return results.map((r, i) => ({
      userId: r.userId,
      username: r.username,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      totalExp: r.totalExp,
      level: getLevel(r.totalExp),
      rank: i + 1,
    }));
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
          username: profiles.username,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        })
        .from(expEvents)
        .innerJoin(profiles, eq(profiles.id, expEvents.userId))
        .leftJoin(userExp, eq(userExp.userId, expEvents.userId))
        .where(gte(expEvents.createdAt, startDate))
        .groupBy(
          expEvents.userId,
          userExp.totalExp,
          profiles.username,
          profiles.displayName,
          profiles.avatarUrl
        )
        .orderBy(desc(totalExpAlias))
        .limit(LIMIT);

      return results.map((r, i) => ({
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        totalExp: r.totalExp,
        level: getLevel(r.cumulativeTotalExp ?? 0),
        rank: i + 1,
      }));
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
