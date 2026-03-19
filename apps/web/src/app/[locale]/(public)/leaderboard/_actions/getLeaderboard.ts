'use server';

import {
  getAllTimeRanking,
  getMonthlyRanking,
  getUserAllTimeRankedRow,
  getUserMonthlyRankedRow,
  getUserWeeklyRankedRow,
  getWeeklyRanking,
} from '@/lib/db/challenge-queries';
import type { LeaderboardPage, RankedLeaderboardRow } from '@/lib/db/challenge-queries';
import { createClient } from '@/lib/supabase/server';

import type {
  LeaderboardModule,
  LeaderboardPeriod,
  LeaderboardResult,
  LeaderboardRow,
} from '../_lib/types';
import { MODULES, MODULE_KEYS, PAGE_SIZE, VALID_PERIODS } from '../_lib/types';

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

function isValidModule(value: string): value is LeaderboardModule {
  return (MODULES as string[]).includes(value);
}

function isValidPeriod(value: string): value is LeaderboardPeriod {
  return (VALID_PERIODS as string[]).includes(value);
}

function isValidKey(module: LeaderboardModule, key: string): boolean {
  return MODULE_KEYS[module].includes(key);
}

function isValidPage(page: number): boolean {
  return Number.isInteger(page) && page >= 1;
}

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

  // Select ranking function based on period
  let rankingFn: (
    menuType: string,
    leaderboardKey: string,
    offset: number,
    limit: number
  ) => Promise<LeaderboardPage>;
  let userRankedRowFn: (
    userId: string,
    menuType: string,
    leaderboardKey: string
  ) => Promise<RankedLeaderboardRow | null>;

  switch (period) {
    case 'all-time':
      rankingFn = getAllTimeRanking;
      userRankedRowFn = getUserAllTimeRankedRow;
      break;
    case 'weekly':
      rankingFn = getWeeklyRanking;
      userRankedRowFn = getUserWeeklyRankedRow;
      break;
    case 'monthly':
      rankingFn = getMonthlyRanking;
      userRankedRowFn = getUserMonthlyRankedRow;
      break;
  }

  const { rows, total } = await rankingFn(module, key, offset, PAGE_SIZE);

  // Map query rows to ranked rows for UI
  const leaderboardRows: LeaderboardRow[] = rows.map((r, i) => ({
    ...r,
    rank: offset + i + 1,
  }));

  // Fetch current user's rank if they're not on the current page
  let currentUserRank: LeaderboardRow | null = null;
  if (currentUserId && !leaderboardRows.some((r) => r.userId === currentUserId)) {
    currentUserRank = await userRankedRowFn(currentUserId, module, key);
  }

  return { rows: leaderboardRows, totalCount: total, currentUserRank };
}
