import { getQueriesForPeriod } from '../_lib/period-queries';
import type { LeaderboardPeriod, UserRankInfo } from '../_lib/types';
import { ALL_LEADERBOARD_ENTRIES } from '../_lib/types';

export async function getUserRanks(
  userId: string,
  period: LeaderboardPeriod
): Promise<UserRankInfo[]> {
  const { getUserRank } = getQueriesForPeriod(period);

  const results = await Promise.allSettled(
    ALL_LEADERBOARD_ENTRIES.map(async ({ module, key }) => {
      const result = await getUserRank(userId, module, key);
      if (!result) return null;
      return { module, key, rank: result.rank };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<UserRankInfo | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((r): r is UserRankInfo => r !== null);
}
