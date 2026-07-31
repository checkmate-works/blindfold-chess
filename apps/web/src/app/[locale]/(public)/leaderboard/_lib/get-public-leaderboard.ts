import { unstable_cache } from 'next/cache';

import { LEADERBOARD_CACHE_TAG } from '@/lib/cache-tags';
import { handleServerActionError } from '@/lib/server-action-error';

import { getQueriesForPeriod } from './period-queries';
import type { LeaderboardModule, LeaderboardPeriod, LeaderboardRow } from './types';
import { PAGE_SIZE } from './types';
import { isValidKey, isValidModule, isValidPage, isValidPeriod } from './validators';

export type PublicLeaderboardResult = {
  rows: LeaderboardRow[];
  totalCount: number;
};

const EMPTY_RESULT: PublicLeaderboardResult = { rows: [], totalCount: 0 };

const REVALIDATE_SECONDS = 60; // 1 minute

/**
 * Cached ranking data, shared across all users. Keyed by every argument so
 * each page of each board caches independently; tagged so admin-side score
 * mutations can purge the whole family at once.
 */
function getCachedRanking(
  module: LeaderboardModule,
  key: string,
  period: LeaderboardPeriod,
  offset: number,
  limit: number
) {
  return unstable_cache(
    async () => {
      const { getRanking } = getQueriesForPeriod(period);
      return getRanking(module, key, offset, limit);
    },
    ['leaderboard-ranking', module, key, period, String(offset), String(limit)],
    { revalidate: REVALIDATE_SECONDS, tags: [LEADERBOARD_CACHE_TAG] }
  )();
}

/**
 * Viewer-independent leaderboard page: the ranked rows plus the total count,
 * with no notion of "the current user".
 *
 * Split out of the `getLeaderboard` Server Action on purpose: this function
 * touches no request state (`cookies()` / `auth.getUser()`), so Server
 * Components on static/ISR routes — the practice-top previews — can call it
 * without tainting the route as dynamic. `getLeaderboard` composes this with
 * the per-viewer rank lookup for the interactive leaderboard pages.
 */
export async function getPublicLeaderboard(
  module: LeaderboardModule,
  key: string,
  period: LeaderboardPeriod,
  page: number
): Promise<PublicLeaderboardResult> {
  if (
    !isValidModule(module) ||
    !isValidPeriod(period) ||
    !isValidKey(module, key) ||
    !isValidPage(page)
  ) {
    return EMPTY_RESULT;
  }

  const offset = (page - 1) * PAGE_SIZE;

  try {
    const { rows, total } = await getCachedRanking(module, key, period, offset, PAGE_SIZE);
    const leaderboardRows: LeaderboardRow[] = rows.map((r, i) => ({
      ...r,
      rank: offset + i + 1,
    }));
    return { rows: leaderboardRows, totalCount: total };
  } catch (error) {
    handleServerActionError(error, '[getPublicLeaderboard]');
    return EMPTY_RESULT;
  }
}
