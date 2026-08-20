'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ChessEngine } from '@blindfold-chess/features/ai-game/engine';

import type { AiReview, AiReviewError } from '@/lib/ai-review/types';
import { createWorkerMessageChannel } from '@/lib/engines/stockfish/worker-message-channel';
import { evaluatePositions } from '@/lib/games/analysis/evaluate-positions';

import { generateAiReviewAction } from '../_actions/generate-ai-review';

/**
 * Same public asset the play screen's Stockfish opponent boots from
 * (`createStockfishOpponent`); the review sweep spins up its OWN engine
 * instance because `ChessEngine` is single-request and a shared instance
 * could collide with a live game in another tab section.
 */
const STOCKFISH_WORKER_PATH = '/stockfish.js';

export type AiReviewGenerationState =
  | { phase: 'idle' }
  | { phase: 'analyzing'; done: number; total: number }
  | { phase: 'generating' }
  | { phase: 'done'; review: AiReview }
  | { phase: 'error'; error: AiReviewError | 'analysis_failed' };

export type UseAiReviewGenerationReturn = {
  state: AiReviewGenerationState;
  /**
   * Kick off the sweep + server generation, writing the review in `locale`
   * (the author's choice, not necessarily the page's). No-op while already
   * running.
   */
  start: (locale: string) => void;
  /** Abort a running sweep (between positions) and return to idle. */
  cancel: () => void;
};

/**
 * Drives the client half of AI review generation: run the Stockfish sweep
 * over every position (with progress), ship the evaluations to the server
 * action, surface the stored review. The engine lives only for the duration
 * of one sweep — created on start, destroyed on completion, cancel, and
 * unmount — so navigating away never leaks a Worker.
 */
export function useAiReviewGeneration({
  gameId,
  moves,
  startingFen,
}: {
  gameId: string;
  moves: string[];
  startingFen: string | null;
}): UseAiReviewGenerationReturn {
  const [state, setState] = useState<AiReviewGenerationState>({ phase: 'idle' });
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

          setState({ phase: 'generating' });

          const response = await generateAiReviewAction({
            gameId,
            locale,
            evaluations: swept.value,
          });
          if (!isCurrent()) return;
          setState(
            response.success
              ? { phase: 'done', review: response.review }
              : { phase: 'error', error: response.error }
          );
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
