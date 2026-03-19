'use server';

import { isUserBanned } from '@/lib/ban';
import { deriveLeaderboardKey } from '@/lib/db/leaderboard-key';
import { PRACTICE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import type { PracticeMenuType } from '@/lib/db/practice-menu-types';
import { saveChallengeResult } from '@/lib/db/save-challenge-result';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export type SaveResultResponse = {
  success: boolean;
};

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    if (await isUserBanned(user.id)) {
      return { success: false };
    }

    const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.savePracticeResult);
    if ('error' in rateLimitResult) {
      return { success: false };
    }

    if (!(PRACTICE_MENU_TYPES as readonly string[]).includes(menuType)) {
      return { success: false };
    }

    const leaderboardKey = deriveLeaderboardKey(menuType, settings);
    if (!leaderboardKey) {
      return { success: false };
    }

    await saveChallengeResult({
      userId: user.id,
      menuType,
      leaderboardKey,
      score: challengeFields.score,
      incorrectAnswers: challengeFields.incorrectAnswers,
      timeTaken: challengeFields.timeTaken,
    });

    return { success: true };
  } catch (error) {
    console.error(`Failed to save ${menuType} result:`, error);
    return { success: false };
  }
}
