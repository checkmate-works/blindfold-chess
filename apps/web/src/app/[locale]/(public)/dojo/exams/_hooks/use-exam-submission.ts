'use client';

import { useCallback, useRef, useState } from 'react';

import { useRouter } from '@/i18n/routing';
import { examProblemFor, gradeExamProblem } from '@blindfold-chess/features/dojo-journey';
import type { ExamAnswer } from '@blindfold-chess/features/dojo-journey';
import type { EarnedRankSlug, ExamProblemKind } from '@blindfold-chess/features/dojo-ranks';

import { captureError } from '@/lib/sentry/capture-error';

import { stashGrantedRanks } from '@/app/[locale]/(public)/practice/_lib/granted-ranks-stash';

import { submitExamAnswer } from '../_actions/submitExamAnswer';

/**
 * Why a pass was not recorded, shown under the verdict:
 * - `signIn`: the player is signed out; the attempt was graded in the browser.
 * - `locked`: the player is signed in but does not hold the rank below the
 *   exam's, so the server graded it without recording it.
 */
export type ExamUnrecordedReason = 'signIn' | 'locked';

export type ExamVerdict =
  /** The attempt is still in progress. */
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | {
      kind: 'graded';
      passed: boolean;
      /** Position-memory problems only; unrounded. */
      accuracy: number | null;
      unrecorded: ExamUnrecordedReason | null;
    }
  /**
   * The pass completed the exam and a rank was granted; the page is on its
   * way back to the problem list, whose achievement modal shows the rank.
   */
  | { kind: 'promoted' }
  /** The answer could not be sent, or the server refused it. */
  | { kind: 'error' };

type Return = {
  verdict: ExamVerdict;
  /** Send `answer`. Only the first call per attempt goes through. */
  submit: (answer: ExamAnswer) => void;
  /** Settle the attempt as failed without sending anything (the player quit). */
  fail: () => void;
  /** Start a new attempt. */
  reset: () => void;
};

/**
 * Sends an exam answer and turns the reply into the verdict the page shows.
 *
 * The server grades. The client grades by itself only when the server says
 * the player is signed out, and then with the same `gradeExamProblem` the
 * server uses, so practice and the recorded attempt agree.
 *
 * A grant moves the player to the exam's problem list instead of announcing
 * it here: `RankAchievementModal` reads the stashed grant only when it
 * mounts, so the celebration has to happen on the page navigated to.
 */
export function useExamSubmission(rank: EarnedRankSlug, problem: ExamProblemKind): Return {
  const router = useRouter();
  const [verdict, setVerdict] = useState<ExamVerdict>({ kind: 'idle' });
  // Guards one attempt against a second completion callback (StrictMode
  // re-mount, a fast re-render) so the rate-limited action runs once.
  const sentRef = useRef(false);

  const submit = useCallback(
    (answer: ExamAnswer) => {
      if (sentRef.current) return;
      sentRef.current = true;
      setVerdict({ kind: 'submitting' });

      void (async () => {
        try {
          const result = await submitExamAnswer(rank, problem, answer);
          if ('error' in result) {
            const examProblem = examProblemFor(rank, problem);
            if (result.error === 'signInRequired' && examProblem) {
              const { passed, accuracy } = gradeExamProblem(examProblem, answer);
              setVerdict({ kind: 'graded', passed, accuracy, unrecorded: 'signIn' });
            } else {
              setVerdict({ kind: 'error' });
            }
            return;
          }

          const { passed, accuracy, recorded, grantedRanks } = result;
          if (grantedRanks.length > 0) {
            stashGrantedRanks(grantedRanks);
            setVerdict({ kind: 'promoted' });
            router.push(`/dojo/exams/${rank}`);
            return;
          }
          setVerdict({
            kind: 'graded',
            passed,
            accuracy,
            unrecorded: passed && !recorded ? 'locked' : null,
          });
        } catch (err) {
          captureError(err, '[useExamSubmission] submitExamAnswer');
          setVerdict({ kind: 'error' });
        }
      })();
    },
    [rank, problem, router]
  );

  const fail = useCallback(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    setVerdict({ kind: 'graded', passed: false, accuracy: null, unrecorded: null });
  }, []);

  const reset = useCallback(() => {
    sentRef.current = false;
    setVerdict({ kind: 'idle' });
  }, []);

  return { verdict, submit, fail, reset };
}
