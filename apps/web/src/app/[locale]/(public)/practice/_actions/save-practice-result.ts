'use server';

import { isUserBanned } from '@/lib/ban';
import { db } from '@/lib/db';
import { deriveLeaderboardKey } from '@/lib/db/leaderboard-key';
import { PRACTICE_MENU_TYPES } from '@/lib/db/practice-session-types';
import type { PracticeMenuType } from '@/lib/db/practice-session-types';
import { saveLeaderboardRecord } from '@/lib/db/save-leaderboard-record';
import { practiceSessions } from '@/lib/db/schema';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

const MAX_JSON_SIZE = 10_240;

export type SaveResultResponse = {
  success: boolean;
  id?: string;
};

export type LeaderboardFields = {
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
};

export async function savePracticeResult(
  menuType: PracticeMenuType,
  settings: Record<string, unknown>,
  result: Record<string, unknown>,
  leaderboardFields?: LeaderboardFields
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

    if (JSON.stringify(settings).length > MAX_JSON_SIZE) {
      return { success: false };
    }

    if (JSON.stringify(result).length > MAX_JSON_SIZE) {
      return { success: false };
    }

    const [inserted] = await db
      .insert(practiceSessions)
      .values({
        userId: user.id,
        menuType,
        settings,
        result,
      })
      .returning({ id: practiceSessions.id });

    // Write leaderboard records if fields are provided and a key can be derived
    if (leaderboardFields) {
      const leaderboardKey = deriveLeaderboardKey(menuType, settings);
      if (leaderboardKey) {
        try {
          await saveLeaderboardRecord({
            userId: user.id,
            sessionId: inserted.id,
            menuType,
            leaderboardKey,
            score: leaderboardFields.score,
            incorrectAnswers: leaderboardFields.incorrectAnswers,
            timeTaken: leaderboardFields.timeTaken,
          });
        } catch (leaderboardError) {
          // Log but don't fail the overall save — the practice session is already persisted
          console.error(`Failed to save leaderboard record for ${menuType}:`, leaderboardError);
        }
      }
    }

    return { success: true, id: inserted.id };
  } catch (error) {
    console.error(`Failed to save ${menuType} result:`, error);
    return { success: false };
  }
}
