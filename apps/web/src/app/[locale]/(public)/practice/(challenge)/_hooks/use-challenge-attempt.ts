'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from '@blindfold-chess/features/challenge-attempt';
import type { ChallengeMenuType } from '@blindfold-chess/features/practice-registry';

import { captureError } from '@/lib/sentry/capture-error';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { answerChallengeAttempt, beginChallengeAttempt } from '../_actions/challenge-attempt';

/**
 * What a session is mounted with once the attempt is settled: a server-run
 * attempt for a signed-in player, or none for a guest (who plays on the
 * device only and is not recorded).
 */
export type ChallengeAttemptReady<TQuestion> =
  | { attemptId: string; remote: RemoteChallengePort<TQuestion> }
  | { attemptId: null; remote: undefined };

/**
 * Why a start failed, as far as the player can act on it. `rateLimited` is
 * told apart because trying again at once cannot work and the connection is
 * not at fault; everything else (no answer, an outage, a refused request) is
 * `failed`.
 */
export type ChallengeStartFailure = 'rateLimited' | 'failed';

export type ChallengeAttemptState<TQuestion> =
  | { status: 'loading' }
  | ({ status: 'ready' } & ChallengeAttemptReady<TQuestion>)
  | { status: 'error'; reason: ChallengeStartFailure; retry: () => void };

type BeginOutcome<TQuestion> =
  | ({ status: 'ready' } & ChallengeAttemptReady<TQuestion>)
  | { status: 'error'; reason: ChallengeStartFailure };

const GUEST: { status: 'ready'; attemptId: null; remote: undefined } = {
  status: 'ready',
  attemptId: null,
  remote: undefined,
};

/**
 * Starts the server-run attempt a challenge session plays against.
 *
 * A signed-in player's challenge is run by the server: `beginChallengeAttempt`
 * generates the whole question list and stores it on the attempt row, every
 * answer is graded there and answered with the next question, and the finish
 * sends nothing but the attempt id. The score that reaches the leaderboard is
 * therefore never the client's own claim. A guest gets no attempt
 * (`attemptId: null`, `remote: undefined`): the session runs on the device
 * and is not recorded, as before.
 *
 * Waits for the auth state to resolve first, then calls `beginChallengeAttempt`
 * exactly once per mount (and once per `retry`). If the start fails the state
 * is `error` and the session must not be mounted at all: the player is told
 * now, with a retry, instead of after a minute of play that cannot be saved.
 * (Once play has started, the session hook itself ends the run unrecorded
 * when three answer submissions in a row fail — see `remoteFailed`.)
 *
 * The port is built once per successful start and kept for the attempt's
 * life, so the session hook — which reads `remote` on mount only — always
 * talks to the attempt it was mounted with. The ready state is frozen: a
 * later auth change does not swap a running session's attempt.
 *
 * `settings` is read on the call that starts the attempt; it must already be
 * in the shape the module's `parseSettings` accepts.
 *
 * The question type is the caller's to assert: the action returns `unknown`,
 * and each screen knows which module it started.
 */
export function useChallengeAttempt<TQuestion>(
  menuType: ChallengeMenuType,
  settings: unknown
): ChallengeAttemptState<TQuestion> {
  const { user, isLoading } = useAuth();
  const userId = user?.id ?? null;
  const [attemptToken, setAttemptToken] = useState(0);
  const [state, setState] = useState<ChallengeAttemptState<TQuestion>>({ status: 'loading' });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const settledRef = useRef(false);
  // The request is kept outside the effect so that an effect re-run (React
  // Strict Mode's mount-unmount-mount, or a dependency change while it is in
  // flight) subscribes to the same request instead of starting a second
  // attempt.
  const requestRef = useRef<{ token: number; promise: Promise<BeginOutcome<TQuestion>> } | null>(
    null
  );

  const retry = useCallback(() => {
    settledRef.current = false;
    setState({ status: 'loading' });
    setAttemptToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (settledRef.current || isLoading) return;

    if (userId === null) {
      settledRef.current = true;
      setState(GUEST);
      return;
    }

    if (requestRef.current?.token !== attemptToken) {
      requestRef.current = {
        token: attemptToken,
        promise: startAttempt<TQuestion>(menuType, settingsRef.current),
      };
    }

    let cancelled = false;
    void requestRef.current.promise.then((outcome) => {
      if (cancelled) return;
      if (outcome.status === 'ready') {
        settledRef.current = true;
        setState(outcome);
      } else {
        setState({ status: 'error', reason: outcome.reason, retry });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, userId, attemptToken, menuType, retry]);

  return state;
}

async function startAttempt<TQuestion>(
  menuType: ChallengeMenuType,
  settings: unknown
): Promise<BeginOutcome<TQuestion>> {
  try {
    const result = await beginChallengeAttempt(menuType, settings);
    if (!result.success) {
      console.error(`Failed to begin ${menuType} challenge:`, result.error);
      return { status: 'error', reason: result.error === 'rateLimited' ? 'rateLimited' : 'failed' };
    }
    const { attemptId } = result;
    const remote: RemoteChallengePort<TQuestion> = {
      first: {
        sequence: result.first.sequence,
        question: result.first.question as TQuestion,
      },
      submitAnswer: (sequence, answer) =>
        answerChallengeAttempt(attemptId, sequence, answer) as Promise<
          ChallengeAnswerResponse<TQuestion>
        >,
    };
    return { status: 'ready', attemptId, remote };
  } catch (error) {
    captureError(error, `Failed to begin ${menuType} challenge`);
    return { status: 'error', reason: 'failed' };
  }
}
