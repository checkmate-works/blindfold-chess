import {
  getUserAllTimeRank,
  getUserMonthlyRank,
  getUserWeeklyRank,
} from '@/lib/db/challenge-queries';

import type { LeaderboardPeriod, UserRankInfo } from '../_lib/types';
import { ALL_LEADERBOARD_ENTRIES } from '../_lib/types';

export async function getUserRanks(
  userId: string,
  period: LeaderboardPeriod
): Promise<UserRankInfo[]> {
  let rankFn: (
    userId: string,
    menuType: string,
    leaderboardKey: string
  ) => Promise<{ rank: number } | null>;

  switch (period) {
    case 'all-time':
      rankFn = getUserAllTimeRank;
      break;
    case 'weekly':
      rankFn = getUserWeeklyRank;
      break;
    case 'monthly':
      rankFn = getUserMonthlyRank;
      break;
  }

  const results = await Promise.all(
    ALL_LEADERBOARD_ENTRIES.map(async ({ module, key }) => {
      const result = await rankFn(userId, module, key);
      if (!result) return null;
      return { module, key, rank: result.rank };
    })
  );

  return results.filter((r): r is UserRankInfo => r !== null);
}
