import { NextResponse } from 'next/server';

import { requireCronAuth, runCronJob } from '@/lib/cron';
import { reapOldRankUpdateFeedItems } from '@/lib/feed-items/reap-old-rank-updates';

/**
 * Vercel Cron entrypoint for the rank-update feed-item reaper.
 *
 * @description
 * Daily sweep that deletes `feed_items` rows of type
 * `challenge_rank_update` older than 30 days. See
 * `src/lib/feed-items/reap-old-rank-updates.ts` for the strategy and
 * the design rationale (entity-type guard, batching, wall-clock
 * budget). This route is a thin shim — auth + error funnel, both via
 * `@/lib/cron`.
 *
 * @design Auth via `CRON_SECRET` (timing-safe compare)
 *
 * `requireCronAuth` does a `crypto.timingSafeEqual` compare so a remote
 * attacker cannot use timing sidechannels to brute-force the secret one
 * byte at a time, and returns 500 (not 401) when `CRON_SECRET` is unset
 * so a misconfig is loud rather than silently authenticating a request
 * whose header is the literal string `"Bearer undefined"`.
 *
 * @design Schedule timezone
 *
 * Vercel Cron schedules are interpreted in UTC. The 30-day retention
 * window is computed in UTC inside the reaper (`new Date()` returns a
 * UTC instant; the reaper subtracts `RANK_UPDATE_RETENTION_MS` from
 * it). User-facing feed timestamps render in the user's local TZ at
 * read time, but the reaper itself does not branch on timezone.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  return runCronJob('Rank-update feed-item reaper', async () => {
    const report = await reapOldRankUpdateFeedItems();
    return NextResponse.json({
      message: 'Rank-update feed-item reaper completed',
      ...report,
    });
  });
}
