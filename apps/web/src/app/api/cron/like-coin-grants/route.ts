import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';

import { grantLikeCoins } from '@/lib/points/grant-like-coins';

/**
 * Daily cron — grants coins for UGC likes (issue #87).
 *
 * Scheduled in `vercel.json`. Authenticated via the `CRON_SECRET` bearer
 * token, same as the other cron routes.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await grantLikeCoins();

    return NextResponse.json({
      message: result.initialized
        ? 'Watermark initialized — historical likes not paid out'
        : 'Like-coin grants processed',
      ...result,
    });
  } catch (error) {
    console.error(
      'Failed to grant like coins:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
