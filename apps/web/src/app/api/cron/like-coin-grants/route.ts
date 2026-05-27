import { NextResponse } from 'next/server';

import { requireCronAuth, runCronJob } from '@/lib/cron';
import { grantLikeCoins } from '@/lib/points/grant-like-coins';

/**
 * Daily cron — grants coins for UGC likes (issue #87).
 *
 * Scheduled in `vercel.json`. Authenticated via the `CRON_SECRET` bearer
 * token, same as the other cron routes.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  return runCronJob('Grant like coins', async () => {
    const result = await grantLikeCoins();

    return NextResponse.json({
      message: result.initialized
        ? 'Watermark initialized — historical likes not paid out'
        : 'Like-coin grants processed',
      ...result,
    });
  });
}
