import { NextResponse } from 'next/server';

import { requireCronAuth, runCronJob } from '@/lib/cron';
import { reapOrphanedPostImages } from '@/lib/post-images/reap-orphaned-images';

/**
 * Vercel Cron entrypoint for the post-image reaper.
 *
 * @description
 * Daily sweep that removes Storage objects whose parent topic_post has
 * been soft-deleted longer than 7 days. See
 * `src/lib/post-images/reap-orphaned-images.ts` for the strategy. This
 * route is a thin shim — auth + error funnel, both via `@/lib/cron`.
 *
 * @design Auth via `CRON_SECRET` (timing-safe compare)
 *
 * `requireCronAuth` does a `crypto.timingSafeEqual` compare so a remote
 * attacker cannot use timing sidechannels to brute-force the secret one
 * byte at a time, and returns 500 (not 401) when `CRON_SECRET` is unset so
 * a misconfig is loud rather than silently authenticating a request whose
 * header is the literal string `"Bearer undefined"`.
 *
 * The reaper does not run under any user session — it bypasses RLS via
 * the admin client by design.
 *
 * @design Schedule timezone
 *
 * Vercel Cron schedules are interpreted in UTC. The 7-day retention
 * window is also computed in UTC (`new Date()` returns a UTC instant;
 * the reaper subtracts `REAP_RETENTION_MS` from it). End users see
 * dates in their local TZ via `toLocaleString()` at render time, but
 * the reaper itself does not branch on timezone.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  return runCronJob('Post-image reaper', async () => {
    const report = await reapOrphanedPostImages();
    return NextResponse.json({
      message: 'Post-image reaper completed',
      ...report,
    });
  });
}
