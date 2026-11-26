import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { challengeBestScores } from '@/lib/db/schema';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';

import { getAchievedSlugsForUser } from '@/app/[locale]/(public)/dojo/ranks/_lib/queries';

export const dynamic = 'force-dynamic';

/**
 * Dojo progress (道場の進捗) for the mobile app
 *
 * @description
 * What the app's dojo needs to show each requirement as met or not: the
 * ranks the user holds (as stored — ranks can be granted out of order, so
 * this is not the ladder below the highest one) and the user's best score
 * on every challenge leaderboard, the same `challenge_best_scores` rows
 * `checkAndGrantRanks` judges `challenge_score` requirements against. The
 * app compares them with the shared requirement list
 * (`@blindfold-chess/features/dojo-ranks`), so no rank logic is repeated
 * here. Only the user's own rows (the app shows no other user).
 */
export async function GET(request: Request) {
  return withMobileErrors('dojo', async () => {
    const auth = await authorizeMobileRequest(request);
    if (!auth.ok) return auth.response;
    const [achieved, bestScores] = await Promise.all([
      getAchievedSlugsForUser(auth.user.id),
      db
        .select({
          menuType: challengeBestScores.menuType,
          leaderboardKey: challengeBestScores.leaderboardKey,
          score: challengeBestScores.score,
        })
        .from(challengeBestScores)
        .where(eq(challengeBestScores.userId, auth.user.id)),
    ]);
    return mobileJson({ achievedRanks: [...achieved], bestScores });
  });
}

export const OPTIONS = mobilePreflight;
