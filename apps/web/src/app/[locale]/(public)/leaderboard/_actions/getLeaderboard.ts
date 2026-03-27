'use server';

import { unstable_cache } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

import { getQueriesForPeriod } from '../_lib/period-queries';
import {
  type LeaderboardModule,
  type LeaderboardPeriod,
  type LeaderboardResult,
  type LeaderboardRow,
  PAGE_SIZE,
} from '../_lib/types';
import { isValidKey, isValidModule, isValidPage, isValidPeriod } from '../_lib/validators';

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cached ranking data (shared across all users)
// ---------------------------------------------------------------------------

const REVALIDATE_SECONDS = 60; // 1 minute

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
    { revalidate: REVALIDATE_SECONDS, tags: ['leaderboard'] }
  )();
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const EMPTY_RESULT: LeaderboardResult = { rows: [], totalCount: 0, currentUserRank: null };

export async function getLeaderboard(
  module: LeaderboardModule,
  key: string,
  period: LeaderboardPeriod,
  page: number
): Promise<LeaderboardResult> {
  // Validate inputs from client
  if (
    !isValidModule(module) ||
    !isValidPeriod(period) ||
    !isValidKey(module, key) ||
    !isValidPage(page)
  ) {
    return EMPTY_RESULT;
  }

  const offset = (page - 1) * PAGE_SIZE;
  const currentUserId = await getCurrentUserId();

  try {
    const { rows, total } = await getCachedRanking(module, key, period, offset, PAGE_SIZE);

    // Map query rows to ranked rows for UI
    const leaderboardRows: LeaderboardRow[] = rows.map((r, i) => ({
      ...r,
      rank: offset + i + 1,
    }));

    // Fetch current user's rank if they're not on the current page
    let currentUserRank: LeaderboardRow | null = null;
    if (currentUserId && !leaderboardRows.some((r) => r.userId === currentUserId)) {
      const { getUserRankedRow } = getQueriesForPeriod(period);
      currentUserRank = await getUserRankedRow(currentUserId, module, key);
    }

    return { rows: leaderboardRows, totalCount: total, currentUserRank };
  } catch (error) {
    console.error('[getLeaderboard] DB query failed:', error);
    return EMPTY_RESULT;
  }
}
