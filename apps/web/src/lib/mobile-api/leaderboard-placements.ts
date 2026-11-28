import 'server-only';

import {
  getUserAllTimeRank,
  getUserMonthlyRank,
  getUserWeeklyRank,
} from '@/lib/db/challenge-queries';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { LEADERBOARD_KEYS } from '@/lib/games/leaderboard-keys';

/** The leaderboard periods, in the order the app lists them. */
const PERIODS = [
  { period: 'all-time', getRank: getUserAllTimeRank },
  { period: 'monthly', getRank: getUserMonthlyRank },
  { period: 'weekly', getRank: getUserWeeklyRank },
] as const;

export type LeaderboardPlacement = {
  period: (typeof PERIODS)[number]['period'];
  /** 1-based, numbered as the web's leaderboard numbers it (`RANK()`). */
  rank: number;
};

/**
 * Where `userId` now stands on the leaderboard of `menuType` / `leaderboardKey`
 * in each period, read straight from the scores rather than through the
 * leaderboard pages' five-minute cache, so a run that just landed counts.
 *
 * A period the player has no place in — no run in it, or hidden from the
 * leaderboard by their privacy setting — is left out, and so is one whose
 * query failed: the placements are an extra on a result that is already
 * recorded, so one failed read must not take the others with it.
 */
export async function getLeaderboardPlacements(
  userId: string,
  menuType: ChallengeMenuType,
  leaderboardKey: string
): Promise<LeaderboardPlacement[]> {
  const keys: readonly string[] = LEADERBOARD_KEYS[menuType];
  if (!keys.includes(leaderboardKey)) return [];

  const results = await Promise.allSettled(
    PERIODS.map(async ({ period, getRank }) => {
      const result = await getRank(userId, menuType, leaderboardKey);
      return result ? { period, rank: result.rank } : null;
    })
  );
  return results.flatMap((r) => {
    if (r.status === 'rejected') {
      console.error('[mobile finish] leaderboard placement read failed:', r.reason);
      return [];
    }
    return r.value ? [r.value] : [];
  });
}
