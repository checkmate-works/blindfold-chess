'use client';

import { useCallback, useRef, useState } from 'react';

import { useRouter } from '@/i18n/routing';
import * as Sentry from '@sentry/nextjs';

import { savePuzzleResult } from '../_actions/savePuzzleResult';
import type { Attempt } from '../_lib/puzzle-match';
import { writePuzzleResult } from '../_lib/puzzle-result-storage';

const AUTO_NAVIGATE_DELAY_MS = 1000;

type FinishSolveArgs = {
  /** Space-separated SAN of the locked solution line, persisted to sessionStorage. */
  solutionLine: string;
  /** Full attempt history including the final winning move. */
  attempts: Attempt[];
  /** Number of player slots in the solved line, recorded for EXP grant. */
  playerMoveCount: number;
  /** Number of times the user peeked at the board during the run. */
  peekCount: number;
};

type Options = {
  positionId: string;
  /** Starting FEN of the puzzle, persisted into sessionStorage so the result
   *  page can re-render the position without a fresh DB fetch. */
  fen: string;
};

type Return = {
  /** `true` once the puzzle has been solved (final correct move accepted). */
  isSolved: boolean;
  /** `true` between solve and the router.push to /result completing — drives
   *  the "Loading..." PageTitle branch. */
  isNavigatingToResult: boolean;
  finishSolve: (args: FinishSolveArgs) => void;
};

/**
 * Owns the post-solve handshake: result-payload sessionStorage write,
 * EXP-grant Server Action call, and the auto-navigate to /result.
 *
 * Extracted from `PuzzleSessionClient` so the side-effect chain (storage +
 * action + setTimeout-driven router.push, plus the `savedRef` double-fire
 * guard) is testable in isolation and the session client can stay focused
 * on solve detection and the playing UI.
 */
export function usePuzzleCompletion({ positionId, fen }: Options): Return {
  const router = useRouter();
  const [isSolved, setIsSolved] = useState(false);
  const [isNavigatingToResult, setIsNavigatingToResult] = useState(false);
  /**
   * Guards against double-invocation of `finishSolve` (e.g. StrictMode
   * re-mount, fast rerenders). Mirrors the `savedRef` pattern used in
   * position-memory's `SinglePositionSession` and `useChallengeResultSave`,
   * so the EXP-grant Server Action is invoked at most once per solved run.
   */
  const savedRef = useRef(false);

  const finishSolve = useCallback(
    ({ solutionLine, attempts, playerMoveCount, peekCount }: FinishSolveArgs) => {
      if (savedRef.current) return;
      savedRef.current = true;
      setIsSolved(true);

      writePuzzleResult(positionId, { attempts, solutionLine, fen, peekCount });
      setIsNavigatingToResult(true);

      const baseUrl = `/practice/puzzle/${positionId}/result`;
      const incorrectAttempts = attempts.filter((a) => !a.isCorrect).length;

      // Fire the EXP grant in parallel with the auto-navigate timer. We capture
      // the resulting `expEventId` in a closure variable so the eventual
      // `router.push` can append `?grant=<id>` if the save resolves before the
      // 1s feedback delay elapses. If it doesn't (slow network, error), the
      // grant is still persisted DB-side — only the result page's EXP display
      // misses out on this navigation, and it is acceptable degradation.
      let expEventId: string | undefined;
      void savePuzzleResult({
        playerMoveCount,
        incorrectAttempts,
        peekCount,
      })
        .then((result) => {
          if (result.success && result.expEventId) {
            expEventId = result.expEventId;
          }
        })
        .catch((err) => {
          Sentry.captureException(err);
        });

      setTimeout(() => {
        const finalUrl = expEventId
          ? `${baseUrl}?grant=${encodeURIComponent(expEventId)}`
          : baseUrl;
        router.push(finalUrl);
      }, AUTO_NAVIGATE_DELAY_MS);
    },
    [positionId, fen, router]
  );

  return { isSolved, isNavigatingToResult, finishSolve };
}
