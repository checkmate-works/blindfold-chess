import { NextResponse } from 'next/server';

import { runAwinDailyReport } from '@/lib/ads/awin-report/run-daily-report';
import { requireCronAuth, runCronJob } from '@/lib/cron';

/**
 * Vercel Cron entrypoint for the daily Awin → Slack affiliate report.
 *
 * @description
 * Posts yesterday's (UTC) clicks per advertiser and the trailing week's
 * transactions by clickRef to the affiliate Slack channel. See
 * `src/lib/ads/awin-report/run-daily-report.ts` for what is reported, why
 * the day is a UTC day, and why the publisher id and region are fixed
 * configuration rather than discovered. This route is a thin shim — auth +
 * error funnel, both via `@/lib/cron`.
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
 * 02:00 UTC (11:00 JST) in `vercel.json`. The UTC day closes at 09:00 JST;
 * two hours is comfortably past the lag between a click and its appearance
 * in Awin's report, and the post lands mid-morning in Japan where it is
 * read. A missing configuration variable, an Awin error or a rejected
 * webhook all surface as a 500 through `runCronJob`, which captures to
 * Sentry — a silent day without a post is the failure mode this is built to
 * avoid.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  return runCronJob('Awin daily report', async () => {
    const result = await runAwinDailyReport({});
    return NextResponse.json({
      message: 'Awin daily report posted',
      ...result,
    });
  });
}
