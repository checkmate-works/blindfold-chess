'use server';

import { isUserBanned } from '@/lib/ban';
import { deriveLeaderboardKey } from '@/lib/db/leaderboard-key';
import { PRACTICE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import type { PracticeMenuType } from '@/lib/db/practice-menu-types';
import { saveChallengeResult } from '@/lib/db/save-challenge-result';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export type SaveResultResponse = { success: true } | { success: false; error: string };

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
      console.warn(`[savePracticeResult] ${menuType}: auth failed — getUser() returned null`);
      return { success: false, error: 'auth_failed' };
    }

    if (await isUserBanned(user.id)) {
      console.warn(`[savePracticeResult] ${menuType}: user ${user.id} is banned`);
      return { success: false, error: 'user_banned' };
    }

    const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.savePracticeResult);
    if ('error' in rateLimitResult) {
      console.warn(`[savePracticeResult] ${menuType}: rate limited for user ${user.id}`);
      return { success: false, error: 'rate_limited' };
    }

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
    await saveChallengeResult({
      userId: user.id,
      menuType,
      leaderboardKey,
      score: Math.round(challengeFields.score),
      incorrectAnswers: Math.round(challengeFields.incorrectAnswers),
      timeTaken: Math.round(challengeFields.timeTaken),
    });

    return { success: true };
  } catch (error) {
    console.error(`[savePracticeResult] ${menuType}: unexpected error during save:`, error);
    return { success: false, error: 'unexpected_error' };
  }
}
