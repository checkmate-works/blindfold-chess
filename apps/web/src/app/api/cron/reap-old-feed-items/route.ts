import { NextResponse } from 'next/server';

import { requireCronAuth, runCronJob } from '@/lib/cron';
import {
  reapOldMemberJoinedFeedItems,
  reapOldRankUpdateFeedItems,
} from '@/lib/feed-items/reap-old-feed-items';

/**
 * Vercel Cron entrypoint for the feed-item reapers.
 *
 * @description
 * Daily sweep that deletes `feed_items` rows past their promised
 * retention: `challenge_rank_update` and `member_joined` cards, both
 * after 30 days. See `src/lib/feed-items/reap-old-feed-items.ts` for
 * the strategy and the design rationale (entity-type guard, batching,
 * wall-clock budget). This route is a thin shim — auth + error funnel,
 * both via `@/lib/cron`.
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
 * UTC instant; the reaper subtracts each reaper's retention from
 * it). User-facing feed timestamps render in the user's local TZ at
 * read time, but the reaper itself does not branch on timezone.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  return runCronJob('Feed-item reaper', async () => {
    // Sequential, with budgets that sum under the 60s Hobby timeout. Arrival
    // announcements are one per sign-up, so their share is small.
    const report = await reapOldRankUpdateFeedItems({ budgetMs: 35_000 });
    const memberJoined = await reapOldMemberJoinedFeedItems({ budgetMs: 10_000 });
    return NextResponse.json({
      message: 'Feed-item reaper completed',
      ...report,
      memberJoined,
    });
  });
}
