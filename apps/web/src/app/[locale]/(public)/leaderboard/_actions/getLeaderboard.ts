'use server';

import { createClient } from '@/lib/supabase/server';

import { getQueriesForPeriod } from '../_lib/period-queries';
import type {
  LeaderboardModule,
  LeaderboardPeriod,
  LeaderboardResult,
  LeaderboardRow,
} from '../_lib/types';
import { PAGE_SIZE } from '../_lib/types';
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
  const { getRanking, getUserRankedRow } = getQueriesForPeriod(period);

  try {
    const { rows, total } = await getRanking(module, key, offset, PAGE_SIZE);

    // Map query rows to ranked rows for UI
    const leaderboardRows: LeaderboardRow[] = rows.map((r, i) => ({
      ...r,
      rank: offset + i + 1,
    }));

    // Fetch current user's rank if they're not on the current page
    let currentUserRank: LeaderboardRow | null = null;
    if (currentUserId && !leaderboardRows.some((r) => r.userId === currentUserId)) {
      currentUserRank = await getUserRankedRow(currentUserId, module, key);
    }

    return { rows: leaderboardRows, totalCount: total, currentUserRank };
  } catch (error) {
    console.error('[getLeaderboard] DB query failed:', error);
    return EMPTY_RESULT;
  }
}
