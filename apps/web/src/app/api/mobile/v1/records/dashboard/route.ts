import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import {
  mobileError,
  mobileJson,
  mobilePreflight,
  withMobileErrors,
} from '@/lib/mobile-api/response';

import { loadChallengeDashboard } from '@/app/[locale]/(protected)/mypage/(confirmed)/challenges/_lib/dashboard-queries';

/** An ISO instant from the query string, or undefined when it is missing or unparseable. */
function readInstant(params: URLSearchParams, name: string): Date | undefined {
  const raw = params.get(name);
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * The signed-in user's My Records dashboard — the web's
 * `getChallengeDashboardData` Server Action, authenticated by the app's
 * bearer token instead of the cookie.
 *
 * `?currentStart&currentEnd&previousStart&previousEnd` are ISO instants:
 * the app computes the period's edges in the phone's timezone, which the
 * server does not know. `?menu=` is the preferred menu; the answer's
 * `selectedMenu` is the one the sessions belong to after reconciliation (an
 * unknown or empty menu falls back to the first one with records).
 */
export async function GET(request: Request) {
  return withMobileErrors('records/dashboard', async () => {
    const auth = await authorizeMobileRequest(request);
    if (!auth.ok) return auth.response;

    const params = new URL(request.url).searchParams;
    const currentStart = readInstant(params, 'currentStart');
    const currentEnd = readInstant(params, 'currentEnd');
    const previousStart = readInstant(params, 'previousStart');
    const previousEnd = readInstant(params, 'previousEnd');
    if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
      return mobileError('invalid_input', 400);
    }

    const requested = params.get('menu');
    const preferredMenu = CHALLENGE_MENU_TYPES.find((m): m is ChallengeMenuType => m === requested);

    const data = await loadChallengeDashboard(auth.user.id, preferredMenu, {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd },
    });
    return mobileJson(data);
  });
}

export const OPTIONS = mobilePreflight;
