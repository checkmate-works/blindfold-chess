import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';

import { listAvailableMenuTypes } from '@/app/[locale]/(protected)/mypage/(confirmed)/challenges/_lib/dashboard-queries';
import { isKeyedMenu } from '@/app/[locale]/(protected)/mypage/(confirmed)/challenges/_lib/keyed-menus';
import {
  getChallengeResultsPaginated,
  getLatestLeaderboardKey,
} from '@/app/[locale]/(protected)/mypage/(confirmed)/challenges/_lib/queries';

/**
 * One page of the signed-in user's challenge results, newest first — the
 * web's `/mypage/challenges/results` page as JSON.
 *
 * `?page=` (1-based), `?menu=` and `?key=` filter as on the web: a keyed
 * menu (board orientation, piece) is always listed through one key, and
 * without `key` the user's most recent key for it is used. The answer
 * carries the key it used, so the app's filter shows what is listed, and
 * the all-time `availableMenuTypes` for the menu filter.
 */
export async function GET(request: Request) {
  return withMobileErrors('records/results', async () => {
    const auth = await authorizeMobileRequest(request);
    if (!auth.ok) return auth.response;

    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
    const requested = params.get('menu');
    const menuType = CHALLENGE_MENU_TYPES.find((m): m is ChallengeMenuType => m === requested);
    const key = params.get('key') || undefined;

    const leaderboardKey =
      menuType &&
      (key ??
        (isKeyedMenu(menuType)
          ? await getLatestLeaderboardKey(auth.user.id, menuType)
          : undefined));

    const [{ items, totalPages }, availableMenuTypes] = await Promise.all([
      getChallengeResultsPaginated(auth.user.id, page, menuType, leaderboardKey),
      listAvailableMenuTypes(auth.user.id),
    ]);

    return mobileJson({
      items,
      page,
      totalPages,
      menu: menuType ?? null,
      key: leaderboardKey ?? null,
      availableMenuTypes,
    });
  });
}

export const OPTIONS = mobilePreflight;
