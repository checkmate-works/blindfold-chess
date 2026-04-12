'use server';

import { revalidateTag } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { deriveLeaderboardKey } from '@/lib/db/leaderboard-key';
import { PRACTICE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import type { PracticeMenuType } from '@/lib/db/practice-menu-types';
import { saveChallengeResult } from '@/lib/db/save-challenge-result';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';

export type SaveResultResponse =
  | {
      success: true;
      grantedRanks?: { slug: string; level: number; color: string | null }[];
      /**
       * ID of the challenge_results row just inserted. Passed to the result
       * page as `?grant=<id>` so the page can refetch the granted EXP event
       * server-side (see `getExpInfoBySource`).
       */
      challengeResultId?: string;
    }
  | { success: false; error: string };

export type ChallengeFields = {
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
};

/**
 * Saves a challenge result directly to challenge_results and challenge_best_scores.
 *
 * @param menuType - The practice menu type
 * @param settings - Module settings (used to derive leaderboardKey)
 * @param challengeFields - Score, incorrectAnswers, and timeTaken for the challenge
 */
export async function savePracticeResult(
  menuType: PracticeMenuType,
  settings: Record<string, unknown>,
  challengeFields: ChallengeFields
): Promise<SaveResultResponse> {
  try {
    const guardResult = await authenticateAndGuard(RATE_LIMITS.savePracticeResult);
    if ('error' in guardResult) {
      console.warn(`[savePracticeResult] ${menuType}: guard failed — ${guardResult.error}`);
      return { success: false, error: guardResult.error };
    }
    const { user } = guardResult;

    if (!(PRACTICE_MENU_TYPES as readonly string[]).includes(menuType)) {
      console.warn(`[savePracticeResult] invalid menuType: ${menuType}`);
      return { success: false, error: 'invalid_menu_type' };
    }

    const leaderboardKey = deriveLeaderboardKey(menuType, settings);
    if (!leaderboardKey) {
      console.warn(
        `[savePracticeResult] ${menuType}: deriveLeaderboardKey returned null for settings:`,
        JSON.stringify(settings)
      );
      return { success: false, error: 'invalid_leaderboard_key' };
    }

    // Round to integers — DB columns are integer type, but timers may produce floats
    const { grantedRanks, challengeResultId } = await saveChallengeResult({
      userId: user.id,
      menuType,
      leaderboardKey,
      score: Math.round(challengeFields.score),
      incorrectAnswers: Math.round(challengeFields.incorrectAnswers),
      timeTaken: Math.round(challengeFields.timeTaken),
    });

    // Invalidate both leaderboard caches so the result page the user is about
    // to see reflects their just-saved score immediately.
    //
    // - 'leaderboard'     → module-specific ranking cache (getLeaderboard /
    //                        getUserRanks). The result page queries the weekly
    //                        period, where every completion can shift ranks
    //                        even without an all-time best.
    // - 'exp-leaderboard' → global EXP ranking cache (getExpLeaderboard). Every
    //                        challenge completion grants EXP, so this cache is
    //                        always affected.
    //
    // Strict invalidation (`expire: 0`) rather than the previous `expire: 60`:
    // the user expects to see their own fresh score on the very next page
    // load, not up to 60 s later. `expire: 0` also flips `pathWasRevalidated`
    // so this server action gets read-your-own-writes semantics.
    //
    // TODO: Optimise — only invalidate when the user is in (or enters) the Top 50.
    // Currently fires on every challenge completion. If traffic grows, consider
    // checking the user's rank before invalidating.
    revalidateTag('leaderboard', { expire: 0 });
    revalidateTag('exp-leaderboard', { expire: 0 });

    return { success: true, grantedRanks, challengeResultId };
  } catch (error) {
    return handleServerActionError(error, `[savePracticeResult] ${menuType}`);
  }
}
