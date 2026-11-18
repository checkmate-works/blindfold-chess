'use client';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { captureError } from '@/lib/sentry/capture-error';
import { writeSessionItem } from '@/lib/storage/session-storage';

import { stashGrantedRanks } from '@/app/[locale]/(public)/practice/_lib/granted-ranks-stash';
import { SESSION_STORAGE_KEYS } from '@/app/[locale]/(public)/practice/_lib/session-storage-keys';

import { finishChallengeAttempt } from '../_actions/challenge-attempt';
import type { SaveResultResponse } from '../_lib/save-result-response';

/**
 * How many times a finish answered `pending` is sent again before the save is
 * given up as failed. Once the device clock has run out the server's time
 * left is the difference between the two clocks — milliseconds, not seconds —
 * so a handful of resends is plenty.
 */
const MAX_PENDING_RESENDS = 5;

/** Added to the server's `remainingMs` so the resend lands after its limit, not on it. */
const PENDING_RESEND_MARGIN_MS = 100;

type UseChallengeResultSaveOptions = {
  isFinished: boolean;
  /** Answers given on the device. A run with none is not finished on the server. */
  totalAnswers: number;
  resultUrl: string;
  /** The server-run attempt to finish; `null` for a guest, whose run is never recorded. */
  attemptId: string | null;
  /**
   * The session ended because the server refused an answer or could not be
   * reached. The run is not finished on the server, and the player is told
   * the result was not saved.
   */
  remoteFailed: boolean;
  moduleName: string;
  /**
   * When `true`, the result is NOT persisted — no leaderboard record, no EXP
   * grant, no rank evaluation — and the hook redirects straight to the result
   * page. Used by the "quit" flow so an aborted run still shows the same
   * feedback screen without rewarding a partial, voluntarily-abandoned run.
   */
  skipSave?: boolean;
};

/**
 * Appends `?grant=<id>` (or `&grant=<id>` if the URL already has a query) to
 * the given URL so the result page can refetch the granted EXP server-side.
 */
function appendGrantParam(url: string, challengeResultId: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}grant=${encodeURIComponent(challengeResultId)}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Finishes the attempt, waiting out a `pending` answer and asking again.
 *
 * A finish sent before the server's time limit is over is answered with the
 * time left instead of a result: an early finish would make a run's time look
 * shorter, and ties on the leaderboard go to the shorter time. The device's
 * clock and the server's are not perfectly in step, so a finish sent the
 * moment the on-screen clock runs out can still be a little early; it is sent
 * again after the remaining time plus a margin. Still pending after the
 * resends is reported as a failed save.
 */
async function finishWithResends(attemptId: string): Promise<SaveResultResponse> {
  for (let resends = 0; ; resends++) {
    const response = await finishChallengeAttempt(attemptId);
    if (response.status === 'done') {
      if (response.success) {
        return {
          success: true,
          grantedRanks: response.grantedRanks,
          challengeResultId: response.challengeResultId,
        };
      }
      return { success: false, error: response.error };
    }
    if (resends >= MAX_PENDING_RESENDS) return { success: false, error: 'still_pending' };
    await wait(response.remainingMs + PENDING_RESEND_MARGIN_MS);
  }
}

/**
 * Shared hook for challenge completion: finishes the attempt, stores granted
 * ranks in sessionStorage, and redirects to the result page. Prevents
 * finishing twice via a ref guard.
 *
 * The finish sends the attempt id and nothing else: score, mistakes and time
 * are what the server recorded answer by answer, so there is no client-side
 * number left for a modified client to inflate.
 *
 * Skips the finish (redirects directly) for a guest (`attemptId` null), an
 * aborted run (`skipSave`) and an empty run. A run that ended with
 * `remoteFailed` is not finished either, and raises the save-error toast.
 *
 * On successful save, appends `?grant=<challengeResultId>` to the redirect
 * URL so the result page Server Component can refetch the granted EXP and
 * render it via `ExpGainDisplay` — this replaces the previous sessionStorage
 * handoff and works correctly on reload / direct access.
 */
export function useChallengeResultSave({
  isFinished,
  totalAnswers,
  resultUrl,
  attemptId,
  remoteFailed,
  moduleName,
  skipSave = false,
}: UseChallengeResultSaveOptions) {
  const router = useRouter();
  const savedRef = useRef(false);

  useEffect(() => {
    if (!isFinished || savedRef.current) return;
    savedRef.current = true;

    if (attemptId === null) {
      router.push(resultUrl);
      return;
    }

    if (remoteFailed) {
      console.error(`Failed to save ${moduleName} result: the server could not run the attempt`);
      writeSessionItem(SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST, 'true');
      router.push(resultUrl);
      return;
    }

    if (skipSave || totalAnswers === 0) {
      router.push(resultUrl);
      return;
    }

    let redirectUrl = resultUrl;
    finishWithResends(attemptId)
      .then((result) => {
        if (!result.success) {
          console.error(`Failed to save ${moduleName} result:`, result.error);
          writeSessionItem(SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST, 'true');
          return;
        }
        stashGrantedRanks(result.grantedRanks);
        if (result.challengeResultId) {
          redirectUrl = appendGrantParam(resultUrl, result.challengeResultId);
        }
      })
      .catch((error) => {
        captureError(error, `Failed to save ${moduleName} result`);
        writeSessionItem(SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST, 'true');
      })
      .finally(() => {
        router.push(redirectUrl);
      });
  }, [isFinished, totalAnswers, resultUrl, attemptId, remoteFailed, moduleName, router, skipSave]);
}
