'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ChessEngine } from '@blindfold-chess/features/ai-game/engine';

import type { AiReview, AiReviewError, PendingAiReviewJob } from '@/lib/ai-review/types';
import { createWorkerMessageChannel } from '@/lib/engines/stockfish/worker-message-channel';
import { evaluatePositions } from '@/lib/games/analysis/evaluate-positions';

import { getAiReviewJobStatusAction } from '../_actions/ai-review-job-status';
import { requestAiReviewAction } from '../_actions/request-ai-review';

/**
 * Same public asset the play screen's Stockfish opponent boots from
 * (`createStockfishOpponent`); the review sweep spins up its OWN engine
 * instance because `ChessEngine` is single-request and a shared instance
 * could collide with a live game in another tab section.
 */
const STOCKFISH_WORKER_PATH = '/stockfish.js';

/**
 * How often an accepted job is polled, and for how long. The notification is
 * the durable signal; polling only spares an author who stays on the page a
 * reload. A review takes a minute or two, so ten minutes of polling covers
 * every job the sweeper will still retry — after that the notification is
 * the only channel, as it already is for an author who left.
 */
const JOB_POLL_INTERVAL_MS = 10_000;
const JOB_POLL_MAX = 60;

export type AiReviewGenerationState =
  | { phase: 'idle' }
  | { phase: 'analyzing'; done: number; total: number }
  /** The sweep is done and the request is on its way to the server. */
  | { phase: 'submitting' }
  /** Accepted (and charged); the result arrives by notification / polling. */
  | { phase: 'queued'; job: PendingAiReviewJob }
  | { phase: 'done'; review: AiReview }
  | { phase: 'error'; error: AiReviewError | 'analysis_failed' };

export type UseAiReviewGenerationReturn = {
  state: AiReviewGenerationState;
  /**
   * Kick off the sweep + server request, asking for the review in `locale`
   * (the author's choice, not necessarily the page's). No-op while already
   * running or queued.
   */
  start: (locale: string) => void;
  /** Abort a running sweep (between positions) and return to idle. */
  cancel: () => void;
};

/**
 * Drives the client half of AI review generation: run the Stockfish sweep
 * over every position (with progress), ship the evaluations to the server
 * action, then wait on the accepted job until the review exists. The engine
 * lives only for the duration of one sweep — created on start, destroyed on
 * completion, cancel, and unmount — so navigating away never leaks a Worker.
 *
 * Owned by the page (`GameReview`), not by the AI Review tab: the tab is
 * conditionally rendered, and a sweep or a queued job must survive the author
 * looking at another tab in the meantime.
 *
 * @param pendingJob a job the server already holds for this game — the hook
 *   starts in `queued` and polls it, so a reload mid-generation shows the
 *   accepted notice rather than the generate button.
 */
export function useAiReviewGeneration({
  gameId,
  moves,
  startingFen,
  pendingJob,
}: {
  gameId: string;
  moves: string[];
  startingFen: string | null;
  pendingJob: PendingAiReviewJob | null;
}): UseAiReviewGenerationReturn {
  const [state, setState] = useState<AiReviewGenerationState>(() =>
    pendingJob ? { phase: 'queued', job: pendingJob } : { phase: 'idle' }
  );
  const runningRef = useRef<{ engine: ChessEngine; controller: AbortController } | null>(null);

  const teardown = useCallback(() => {
    const running = runningRef.current;
    runningRef.current = null;
    if (running) {
      running.controller.abort();
      void running.engine.destroy();
    }
  }, []);

  // Unmount: kill the Worker and let any in-flight run resolve into the void.
  useEffect(() => teardown, [teardown]);

  // Poll an accepted job until it resolves (or the poll budget runs out, in
  // which case the notification takes over and the notice simply stays up).
  const queuedJobId = state.phase === 'queued' ? state.job.id : null;
  useEffect(() => {
    if (!queuedJobId) return;
    let polls = 0;
    let cancelled = false;
    const timer = setInterval(() => {
      polls += 1;
      if (polls > JOB_POLL_MAX) {
        clearInterval(timer);
        return;
      }
      void getAiReviewJobStatusAction(queuedJobId).then((status) => {
        if (cancelled) return;
        if (status.status === 'done') {
          setState({ phase: 'done', review: status.review });
        } else if (status.status === 'failed') {
          setState({ phase: 'error', error: status.error });
        }
        // `pending` keeps waiting; `not_found` (a job that vanished under us)
        // keeps waiting too — the next server render knows the truth.
      });
    }, JOB_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [queuedJobId]);

  const start = useCallback(
    (locale: string) => {
      if (runningRef.current) return;

      const engine = new ChessEngine(() => createWorkerMessageChannel(STOCKFISH_WORKER_PATH));
      const controller = new AbortController();
      const run = { engine, controller };
      runningRef.current = run;
      // A run that has been cancelled/unmounted must stop touching state.
      const isCurrent = () => runningRef.current === run;

      setState({ phase: 'analyzing', done: 0, total: moves.length + 1 });

      void (async () => {
        try {
          const swept = await evaluatePositions({
            moves,
            startingFen: startingFen ?? undefined,
            evaluator: engine,
            signal: controller.signal,
            onProgress: (done, total) => {
              if (isCurrent()) setState({ phase: 'analyzing', done, total });
            },
          });

          if (!isCurrent()) return;

          if (!swept.ok) {
            // An abort is the user's own doing — return to idle silently.
            // Everything else still reports `analysis_failed`: the sweep now
            // distinguishes "game too long" (a refusal a Retry can never
            // satisfy) from a genuine failure, but telling the user so needs
            // its own message in every locale, so that stays a follow-up.
            if (swept.error.kind === 'aborted') {
              setState({ phase: 'idle' });
            } else {
              console.error('[ai-review] analysis failed', swept.error);
              setState({ phase: 'error', error: 'analysis_failed' });
            }
            return;
          }

          setState({ phase: 'submitting' });

          const response = await requestAiReviewAction({
            gameId,
            locale,
            evaluations: swept.value,
          });
          if (!isCurrent()) return;
          if (!response.success) {
            setState({ phase: 'error', error: response.error });
          } else if (response.status === 'ready') {
            setState({ phase: 'done', review: response.review });
          } else {
            setState({ phase: 'queued', job: response.job });
          }
        } catch (error) {
          // The sweep reports its own failures as values; anything thrown
          // here came from the engine handle or the Server Action call.
          if (!isCurrent()) return;
          console.error('[ai-review] analysis failed', error);
          setState({ phase: 'error', error: 'analysis_failed' });
        } finally {
          if (isCurrent()) {
            runningRef.current = null;
            void engine.destroy();
          }
        }
      })();
    },
    [gameId, moves, startingFen]
  );

  const cancel = useCallback(() => {
    teardown();
    setState({ phase: 'idle' });
  }, [teardown]);

  return { state, start, cancel };
}
