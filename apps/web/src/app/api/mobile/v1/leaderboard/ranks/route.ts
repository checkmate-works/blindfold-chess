import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';

import { getUserRanks } from '@/app/[locale]/(public)/leaderboard/_actions/getUserRanks';
import type { LeaderboardPeriod } from '@/app/[locale]/(public)/leaderboard/_lib/types';

const PERIODS: readonly LeaderboardPeriod[] = ['all-time', 'weekly', 'monthly'];

/**
 * The signed-in user's own rank on each challenge leaderboard for
 * `?period=all-time|weekly|monthly` (default all-time). Only the user's own
 * rows: the app shows no other user (see apps/mobile/CLAUDE.md).
 */
export async function GET(request: Request) {
  return withMobileErrors('leaderboard/ranks', async () => {
    const auth = await authorizeMobileRequest(request);
    if (!auth.ok) return auth.response;
    const requested = new URL(request.url).searchParams.get('period');
    const period = PERIODS.find((p) => p === requested) ?? 'all-time';
    const ranks = await getUserRanks(auth.user.id, period);
    return mobileJson({ period, ranks });
  });
}

export const OPTIONS = mobilePreflight;
