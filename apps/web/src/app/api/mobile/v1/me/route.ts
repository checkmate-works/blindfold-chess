import { getLevel } from '@blindfold-chess/features/exp';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { userExp } from '@/lib/db/schema';
import { resolveHighestAchievedSlug } from '@/lib/dojo/rank-progression';
import { getAchievedSlugsForUser } from '@/lib/dojo/rank-queries';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';
import { isUserBanned } from '@/lib/moderation/ban';
import { getViewerProfile } from '@/lib/users/viewer-profile';

async function readTotalExp(userId: string): Promise<number> {
  const [row] = await db
    .select({ totalExp: userExp.totalExp })
    .from(userExp)
    .where(eq(userExp.userId, userId))
    .limit(1);
  return row?.totalExp ?? 0;
}

export const dynamic = 'force-dynamic';

/**
 * The signed-in account as the app needs it: whether a username is set
 * (recording challenges does not need one; appearing on the web's
 * leaderboard does), whether the account is banned, and the progress the
 * web's mypage leads with: total EXP, the level it gives (`getLevel`, the
 * shared curve) and the highest dojo rank achieved (`null` for none).
 * Answers for a banned account too, so the app can say why recording is
 * refused.
 */
export async function GET(request: Request) {
  return withMobileErrors('me', async () => {
    const auth = await authorizeMobileRequest(request, { allowBanned: true });
    if (!auth.ok) return auth.response;
    const [profile, banned, totalExp, achieved] = await Promise.all([
      getViewerProfile(auth.user.id),
      isUserBanned(auth.user.id),
      readTotalExp(auth.user.id),
      getAchievedSlugsForUser(auth.user.id),
    ]);
    return mobileJson({
      userId: auth.user.id,
      email: auth.user.email ?? null,
      username: profile?.username ?? null,
      banned,
      totalExp,
      level: getLevel(totalExp),
      highestRank: resolveHighestAchievedSlug(achieved),
    });
  });
}

export const OPTIONS = mobilePreflight;
