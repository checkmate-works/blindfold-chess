import { getPublicLeaderboard } from '@/app/[locale]/(public)/leaderboard/_lib/get-public-leaderboard';
import type {
  LeaderboardModule,
  LeaderboardPeriod,
  LeaderboardRow,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { buildDetailPath } from '@/app/[locale]/(public)/leaderboard/_lib/types';

export type LeaderboardPreviewData = {
  rows: LeaderboardRow[];
  detailPath: string;
  period: LeaderboardPeriod;
};

/**
 * Fetch the weekly TOP3 for a leaderboard, falling back to all-time when
 * the weekly leaderboard is empty. Returns null only when both periods have
 * no entries — in production the all-time leaderboard practically always
 * has data, so the preview is shown consistently across modules.
 */
export async function resolveLeaderboardWithFallback(
  module: LeaderboardModule,
  key: string
): Promise<LeaderboardPreviewData | null> {
  const weekly = await getPublicLeaderboard(module, key, 'weekly', 1);
  if (weekly.rows.length > 0) {
    return {
      rows: weekly.rows.slice(0, 3),
      detailPath: buildDetailPath('weekly', module, key),
      period: 'weekly',
    };
  }
  const allTime = await getPublicLeaderboard(module, key, 'all-time', 1);
  if (allTime.rows.length === 0) return null;
  return {
    rows: allTime.rows.slice(0, 3),
    detailPath: buildDetailPath('all-time', module, key),
    period: 'all-time',
  };
}
