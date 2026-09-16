import { NextResponse } from 'next/server';

import { reportStaleSubscriptionPeriods } from '@/lib/billing/stale-subscription-periods';
import { requireCronAuth, runCronJob } from '@/lib/cron';

/**
 * Vercel Cron entrypoint for the stale-subscription-period audit.
 *
 * @description
 * Daily sweep that reports subscriptions still carrying a benefit-granting
 * status while the period Stripe last told us about ended days ago — the
 * signature of a `customer.subscription.*` event that never arrived. See
 * `src/lib/billing/stale-subscription-periods.ts` for the grace period, the
 * payload and why the job reports rather than revokes. This route is a thin
 * shim — auth + error funnel, both via `@/lib/cron`.
 *
 * @design Auth via `CRON_SECRET` (timing-safe compare)
 *
 * `requireCronAuth` does a `crypto.timingSafeEqual` compare so a remote
 * attacker cannot use timing sidechannels to brute-force the secret one byte
 * at a time, and returns 500 (not 401) when `CRON_SECRET` is unset so a
 * misconfig is loud rather than silently authenticating a request whose
 * header is the literal string `"Bearer undefined"`.
 *
 * @design Schedule
 *
 * Daily, and deliberately last among the daily jobs in `vercel.json`. Vercel
 * Cron schedules are interpreted in UTC. Nothing here is time-sensitive — a
 * row that has been stuck for three days is no worse for being found an hour
 * later — so the job takes the slot that competes least with the reapers for
 * session-pooler connections.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  return runCronJob('Stale-subscription-period audit', async () => {
    const report = await reportStaleSubscriptionPeriods();
    return NextResponse.json({
      message: 'Stale-subscription-period audit completed',
      ...report,
    });
  });
}
