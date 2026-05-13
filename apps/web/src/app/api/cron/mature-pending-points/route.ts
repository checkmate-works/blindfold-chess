import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';
import { timingSafeEqual } from 'node:crypto';

import { maturePendingPoints } from '@/lib/points';

/**
 * Vercel Cron entrypoint for the pending-points maturation sweep.
 *
 * @description
 * Daily sweep that promotes UGC point grants older than the maturation
 * window from `earned_pending` into `earned` (spendable). The heavy
 * lifting lives in `@/lib/points/mature-points`; this route is a thin
 * auth + error funnel.
 *
 * @design Auth via `CRON_SECRET` (timing-safe compare)
 *
 * Mirrors `reap-post-images`. Vercel Cron sends `Bearer ${CRON_SECRET}`;
 * compare uses `timingSafeEqual` to deny one-byte-at-a-time brute force.
 * Missing env returns 500 so a misconfig is loud rather than silently
 * letting `"Bearer undefined"` through.
 *
 * @design Schedule cadence
 *
 * Daily is enough — the maturation window is in days and the cron is
 * idempotent, so a missed run is recovered by the next one (UNIQUE on
 * `point_events.idempotency_key` makes re-runs safe).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await maturePendingPoints();
    return NextResponse.json({
      message: 'Pending-points maturation completed',
      ...report,
    });
  } catch (error) {
    console.error(
      'Pending-points maturation failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
