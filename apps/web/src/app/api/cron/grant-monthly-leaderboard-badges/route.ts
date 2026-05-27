import { NextResponse } from 'next/server';

import { grantMonthlyLeaderboardBadges } from '@/lib/achievements/grant-monthly-leaderboard-badges';
import { requireCronAuth, runCronJob } from '@/lib/cron';

export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  return runCronJob('Grant monthly leaderboard badges', async () => {
    const result = await grantMonthlyLeaderboardBadges();

    return NextResponse.json({
      message:
        result.results.length === 0
          ? 'No monthly_leaderboard achievements found'
          : 'Monthly leaderboard badges processed',
      ...result,
    });
  });
}
