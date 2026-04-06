import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';

import { grantMonthlyLeaderboardBadges } from '@/lib/achievements/grant-monthly-leaderboard-badges';

export async function GET(request: Request): Promise<NextResponse> {
  // Authenticate via CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await grantMonthlyLeaderboardBadges();

    return NextResponse.json({
      message:
        result.results.length === 0
          ? 'No monthly_leaderboard achievements found'
          : 'Monthly leaderboard badges processed',
      ...result,
    });
  } catch (error) {
    console.error(
      'Failed to grant monthly leaderboard badges:',
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
