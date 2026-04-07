'use server';

import { revalidateTag } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { deriveLeaderboardKey } from '@/lib/db/leaderboard-key';
import { PRACTICE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import type { PracticeMenuType } from '@/lib/db/practice-menu-types';
import type { ExpInfo } from '@/lib/db/save-challenge-result';
import { saveChallengeResult } from '@/lib/db/save-challenge-result';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';

export type SaveResultResponse =
  | {
      success: true;
      grantedRanks?: { slug: string; level: number; color: string | null }[];
      exp?: ExpInfo;
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
    const { grantedRanks, exp } = await saveChallengeResult({
      userId: user.id,
      menuType,
      leaderboardKey,
      score: Math.round(challengeFields.score),
      incorrectAnswers: Math.round(challengeFields.incorrectAnswers),
      timeTaken: Math.round(challengeFields.timeTaken),
    });

    revalidateTag('exp-leaderboard', { expire: 60 });

    return { success: true, grantedRanks, exp };
  } catch (error) {
    return handleServerActionError(error, `[savePracticeResult] ${menuType}`);
  }
}
