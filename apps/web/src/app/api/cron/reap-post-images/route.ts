import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';

import { reapOrphanedPostImages } from '@/lib/post-images/reap-orphaned-images';

/**
 * Vercel Cron entrypoint for the post-image reaper.
 *
 * @description
 * Daily sweep that removes Storage objects whose parent topic_post has
 * been soft-deleted longer than 7 days. See
 * `src/lib/post-images/reap-orphaned-images.ts` for the strategy. This
 * route is a thin shim — auth + error funnel.
 *
 * @design Auth via `CRON_SECRET`
 *
 * Mirrors the existing `grant-monthly-leaderboard-badges` cron route:
 * Vercel Cron sends a `Bearer ${CRON_SECRET}` header, and the route
 * rejects anything else with 401. The reaper does not run under any user
 * session — it bypasses RLS via the admin client by design.
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
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await reapOrphanedPostImages();
    return NextResponse.json({
      message: 'Post-image reaper completed',
      ...report,
    });
  } catch (error) {
    console.error(
      'Post-image reaper failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    Sentry.captureException(error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
