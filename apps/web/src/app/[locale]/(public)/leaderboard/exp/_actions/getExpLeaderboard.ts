'use server';

import { unstable_cache } from 'next/cache';

import { desc, eq } from 'drizzle-orm';

import { db, profiles, userExp } from '@/lib/db';
import { handleServerActionError } from '@/lib/server-action-error';

export type ExpLeaderboardRow = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalExp: number;
  rank: number;
};

export type ExpLeaderboardResult = {
  rows: ExpLeaderboardRow[];
};

const REVALIDATE_SECONDS = 60;
const LIMIT = 50;

const EMPTY_RESULT: ExpLeaderboardResult = { rows: [] };

const getCachedExpRanking = unstable_cache(
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
      rank: i + 1,
    }));
  },
  ['exp-leaderboard-ranking'],
  { revalidate: REVALIDATE_SECONDS, tags: ['exp-leaderboard'] }
);

export async function getExpLeaderboard(): Promise<ExpLeaderboardResult> {
  try {
    const rows = await getCachedExpRanking();
    return { rows };
  } catch (error) {
    handleServerActionError(error, '[getExpLeaderboard]');
    return EMPTY_RESULT;
  }
}
