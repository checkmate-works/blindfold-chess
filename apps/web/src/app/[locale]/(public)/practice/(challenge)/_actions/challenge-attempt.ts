'use server';

import { revalidateTag } from 'next/cache';

import type { ChallengeAnswerResponse } from '@blindfold-chess/features/challenge-attempt';

import { authenticateAndCheckBan, authenticateAndGuard, isAuthUnavailable } from '@/lib/auth';
import { EXP_LEADERBOARD_CACHE_TAG, LEADERBOARD_CACHE_TAG } from '@/lib/cache-tags';
import {
  answerChallengeAttempt as answerAttempt,
  beginChallengeAttempt as beginAttempt,
  finishChallengeAttempt as finishAttempt,
} from '@/lib/challenge/attempts';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';

import type { SaveResultResponse } from '../_lib/save-result-response';

/**
 * The one error code every not-recorded finish answers with. Whether the run
 * was empty, refused for its speed, or the attempt is unknown is not told to
 * the client: a script probing the speed check would otherwise learn exactly
 * where its floor is.
 */
const NOT_RECORDED = 'not_recorded';

/**
 * Throws when a guard answered `signInRequired` only because the Auth server
 * could not be reached; returns otherwise.
 *
 * The guards cannot tell that case from a visitor who is signed out, and here
 * the difference decides whether a run survives: a start would silently fall
 * back to an unrecorded device-only run, an answer would be `rejected` (which
 * ends the run), and a finish would report the save as failed. Thrown, the
 * failure reaches each action's `catch` and comes out as the retryable kind:
 * the start shows its retry, the answer is resent by the session, and the
 * finish is resent by the save hook.
 */
async function throwIfAuthUnavailable(guardError: string): Promise<void> {
  if (guardError === 'signInRequired' && (await isAuthUnavailable())) {
    throw new Error('Auth server unavailable');
  }
}

/**
 * Starts a server-run challenge for the signed-in player.
 *
 * The settings are validated against the module's allowed values on the
 * server, which also derives the leaderboard key from them. Only the first
 * question is returned; each later one comes with the response to the answer
 * before it.
 */
export async function beginChallengeAttempt(
  menuType: string,
  settings: unknown
): Promise<
  | { success: true; attemptId: string; first: { sequence: number; question: unknown } }
  | { success: false; error: string }
> {
  try {
    const guardResult = await authenticateAndGuard(RATE_LIMITS.beginChallengeAttempt);
    if ('error' in guardResult) {
      await throwIfAuthUnavailable(guardResult.error);
      return { success: false, error: guardResult.error };
    }

    const result = await beginAttempt({
      userId: guardResult.user.id,
      menuType,
      rawSettings: settings,
    });
    if (!result.ok) {
      console.warn(`[beginChallengeAttempt] ${String(menuType)}: ${result.error}`);
      return { success: false, error: result.error };
    }
    return { success: true, attemptId: result.attemptId, first: result.first };
  } catch (error) {
    return handleServerActionError(error, `[beginChallengeAttempt] ${String(menuType)}`);
  }
}

/**
 * Submits one answer and gets back whether it was right and the next question.
 *
 * The arrival time is read on the first line, before anything else runs: the
 * time this action then spends (authentication, the row lock, grading) is
 * not counted as the player's thinking time.
 *
 * Authentication and the ban check only — no database rate limit. A rate
 * limit check is a database round trip that would sit inside every answer's
 * response time, and with a short feedback flash that time can spill into the
 * next question's thinking time. It is not needed either: the attempt row
 * already bounds answering, since it accepts one answer per question, none
 * during the feedback flash, and no more than its question list. Starting and
 * finishing, which create and consume rows, are rate limited.
 *
 * Deliberately no `revalidateTag` here (or anything else that invalidates a
 * cache): it would make Next.js re-render the current page into every
 * answer's response, and this round trip happens once per question.
 */
export async function answerChallengeAttempt(
  attemptId: string,
  sequence: number,
  answer: unknown
): Promise<ChallengeAnswerResponse<unknown>> {
  const receivedAt = Date.now();
  try {
    const authResult = await authenticateAndCheckBan();
    if ('error' in authResult) {
      await throwIfAuthUnavailable(authResult.error);
      return { status: 'rejected' };
    }

    return await answerAttempt({
      userId: authResult.user.id,
      attemptId,
      sequence,
      rawAnswer: answer,
      receivedAt,
    });
  } catch (error) {
    handleServerActionError(error, '[answerChallengeAttempt]');
    // A transient DB/auth failure is not a rejected answer. Let the port's
    // bounded retry resend the same sequence; the row lock and replay branch
    // also make this safe when the first transaction committed before failing.
    throw new Error('Challenge answer temporarily unavailable');
  }
}

/**
 * Finishes the attempt and records its result if it passes the checks.
 *
 * Takes the attempt id only; score, mistakes and time come from the row. A
 * finish sent before the attempt is over answers `pending` with the time left
 * and the client asks again. A resend after the attempt was finished answers
 * with the same result again, without recording twice.
 */
export async function finishChallengeAttempt(
  attemptId: string
): Promise<{ status: 'pending'; remainingMs: number } | (SaveResultResponse & { status: 'done' })> {
  try {
    const guardResult = await authenticateAndGuard(RATE_LIMITS.finishChallengeAttempt);
    if ('error' in guardResult) {
      await throwIfAuthUnavailable(guardResult.error);
      return { status: 'done', success: false, error: guardResult.error };
    }

    const result = await finishAttempt({ userId: guardResult.user.id, attemptId });
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
        console.warn(`[finishChallengeAttempt] ${attemptId}: refused (${result.reason})`);
        return { status: 'done', success: false, error: NOT_RECORDED };
      case 'unrecorded':
      case 'rejected':
        return { status: 'done', success: false, error: NOT_RECORDED };
      default: {
        const exhaustive: never = result;
        return exhaustive;
      }
    }
  } catch (error) {
    return { status: 'done', ...handleServerActionError(error, '[finishChallengeAttempt]') };
  }
}
