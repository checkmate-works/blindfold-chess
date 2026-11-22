import { revalidateTag } from 'next/cache';

import 'server-only';

import { EXP_LEADERBOARD_CACHE_TAG, LEADERBOARD_CACHE_TAG } from '@/lib/cache-tags';
import { finishChallengeAttempt as finishAttempt } from '@/lib/challenge/attempts';
import type { GrantedRank } from '@/lib/db/data/ranks';

const NOT_RECORDED = 'not_recorded';

export type FinishAttemptResponse =
  | { status: 'pending'; remainingMs: number }
  | {
      status: 'done';
      success: true;
      grantedRanks: GrantedRank[];
      challengeResultId: string;
    }
  | { status: 'done'; success: false; error: string };

/**
 * Finishes `userId`'s challenge attempt and maps the outcome to what a
 * client acts on: `pending` (ask again after `remainingMs`), a recorded
 * result, or `not_recorded`. On a recorded run it also expires the
 * leaderboard caches. The caller has authenticated the user and applied the
 * rate limit. Shared by the web's `finishChallengeAttempt` action and the
 * mobile API's `POST /api/mobile/v1/challenges/[id]/finish`.
 */
export async function finishAttemptForUser(
  userId: string,
  attemptId: string
): Promise<FinishAttemptResponse> {
  const result = await finishAttempt({ userId, attemptId });
  switch (result.status) {
    case 'pending':
      return { status: 'pending', remainingMs: result.remainingMs };
    case 'recorded':
      // Both leaderboard caches are read by the result page the player is
      // about to see, so they are invalidated strictly (`expire: 0`) for
      // read-your-own-writes: 'leaderboard' for the module rankings (the
      // weekly period shifts on every recorded run, not only on a new
      // all-time best) and 'exp-leaderboard' because every recorded run
      // grants EXP. A resent finish invalidates again, which is harmless.
      revalidateTag(LEADERBOARD_CACHE_TAG, { expire: 0 });
      revalidateTag(EXP_LEADERBOARD_CACHE_TAG, { expire: 0 });
      return {
        status: 'done',
        success: true,
        grantedRanks: result.grantedRanks,
        challengeResultId: result.challengeResultId,
      };
    case 'refused':
      // Server log only: operators can find refused runs, the client cannot.
      console.warn(`[finishAttemptForUser] ${attemptId}: refused (${result.reason})`);
      return { status: 'done', success: false, error: NOT_RECORDED };
    case 'unrecorded':
    case 'rejected':
      return { status: 'done', success: false, error: NOT_RECORDED };
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}
