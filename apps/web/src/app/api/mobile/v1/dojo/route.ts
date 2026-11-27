import type { MobileDojoResponse } from '@blindfold-chess/features/dojo-journey';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { challengeBestScores } from '@/lib/db/schema';
import { getAchievedSlugsForUser } from '@/lib/dojo/rank-queries';
import { getCompletedSteps } from '@/lib/dojo/step-completions';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';

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
 * here. `completedSteps` are the user's `dojo_step_completions` keys: the
 * guide pages they have read and the exam problems they have passed (the
 * `exam:` keys an `exam_problem` requirement is judged by). Only the user's
 * own rows (the app shows no other user).
 */
export async function GET(request: Request) {
  return withMobileErrors('dojo', async () => {
    const auth = await authorizeMobileRequest(request);
    if (!auth.ok) return auth.response;
    const [achieved, bestScores, completedSteps] = await Promise.all([
      getAchievedSlugsForUser(auth.user.id),
      db
        .select({
          menuType: challengeBestScores.menuType,
          leaderboardKey: challengeBestScores.leaderboardKey,
          score: challengeBestScores.score,
        })
        .from(challengeBestScores)
        .where(eq(challengeBestScores.userId, auth.user.id)),
      getCompletedSteps(auth.user.id),
    ]);
    const response: MobileDojoResponse = {
      achievedRanks: [...achieved],
      bestScores,
      completedSteps,
    };
    return mobileJson(response);
  });
}

export const OPTIONS = mobilePreflight;
