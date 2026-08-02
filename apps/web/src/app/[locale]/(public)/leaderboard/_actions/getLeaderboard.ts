'use server';

import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { handleServerActionError } from '@/lib/server-action-error';
import { createClient } from '@/lib/supabase/server';

import { getPublicLeaderboard } from '../_lib/get-public-leaderboard';
import { getQueriesForPeriod } from '../_lib/period-queries';
import type {
  LeaderboardModule,
  LeaderboardPeriod,
  LeaderboardResult,
  LeaderboardRow,
} from '../_lib/types';

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

/**
 * Viewer-aware leaderboard page: the shared public ranking (see
 * `getPublicLeaderboard` in `../_lib/get-public-leaderboard.ts` — validation
 * and caching live there) plus the current user's own ranked row when they
 * are signed in and not on the requested page.
 *
 * This is a Server Action because the interactive leaderboard UI pages it
 * from the client. It reads the auth cookie, so calling it from a Server
 * Component forces the route dynamic — static/ISR routes must call
 * `getPublicLeaderboard` directly instead.
 */
export async function getLeaderboard(
  module: LeaderboardModule,
  key: string,
  period: LeaderboardPeriod,
  page: number
): Promise<LeaderboardResult> {
  const { rows, totalCount } = await getPublicLeaderboard(module, key, period, page);
  if (rows.length === 0 && totalCount === 0) {
    return { rows, totalCount, currentUserRank: null, viewerHidden: false };
  }

  const currentUserId = await getCurrentUserId();

  // A failed per-viewer lookup degrades to "no own-rank row" rather than
  // discarding the already-fetched public ranking.
  let currentUserRank: LeaderboardRow | null = null;
  let viewerHidden = false;
  if (currentUserId) {
    try {
      // A hidden viewer's ranked-row lookup would return null anyway (the
      // score source filters them out); reading the flag lets the UI say
      // "hidden by your settings" instead of silently showing nothing.
      const [profile] = await db
        .select({ hiddenFromLeaderboard: profiles.hiddenFromLeaderboard })
        .from(profiles)
        .where(eq(profiles.id, currentUserId))
        .limit(1);
      viewerHidden = profile?.hiddenFromLeaderboard ?? false;

      if (!viewerHidden && !rows.some((r) => r.userId === currentUserId)) {
        const { getUserRankedRow } = getQueriesForPeriod(period);
        currentUserRank = await getUserRankedRow(currentUserId, module, key);
      }
    } catch (error) {
      handleServerActionError(error, '[getLeaderboard]');
    }
  }

  return { rows, totalCount, currentUserRank, viewerHidden };
}
