import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';
import { timingSafeEqual } from 'node:crypto';

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
 * @design Auth via `CRON_SECRET` (timing-safe compare)
 *
 * Vercel Cron sends a `Bearer ${CRON_SECRET}` header. The compare uses
 * `crypto.timingSafeEqual` so a remote attacker cannot use timing
 * sidechannels to brute-force the secret one byte at a time. A leading
 * misconfig guard returns 500 if `CRON_SECRET` is unset — without it,
 * the previous `=== ` comparison would compare against the literal
 * string `"Bearer undefined"`, letting a request with that exact
 * header authenticate after a misconfig.
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
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Misconfig: never auto-allow when the env is unset. Returning 500
    // forces the operator to notice (vs. silently letting "Bearer
    // undefined" requests through).
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  // timingSafeEqual requires equal-length inputs — short-circuit on
  // mismatched length BEFORE calling it (the function itself throws on
  // unequal lengths, which would surface as a 500 to the caller).
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
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
