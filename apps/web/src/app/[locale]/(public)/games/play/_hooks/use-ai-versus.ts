import { useCallback, useEffect, useRef, useState } from 'react';

import { maiaRatingToElo } from '@blindfold-chess/features/ai-game/maia';
import type {
  ChessOpponent,
  OpponentError,
  Result,
} from '@blindfold-chess/features/ai-game/opponent';
import { err, ok } from '@blindfold-chess/features/ai-game/opponent';
import {
  getFenAfterMoves,
  getStartingFen,
  uciToAlgebraic,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Fen } from '@blindfold-chess/types';

import { type EngineConfig, createMaiaOpponent, createStockfishOpponent } from '@/lib/engines';

/**
 * Everything `getAiMove` can fail with: the domain's {@link OpponentError}
 * kinds plus the hook-level `not-initialized` state (the opponent effect has
 * not produced an instance yet — construction failed, or the call raced the
 * mount/reset window). Kept a typed union all the way to the orchestration
 * layer so retry decisions branch on `kind`, never on message text.
 */
export type AiMoveError = OpponentError | { readonly kind: 'not-initialized' };

/**
 * Drives an AI opponent for the human-vs-AI game flow.
 *
 * Lifecycle is owned per mount: a fresh {@link ChessOpponent} is created on
 * mount and torn down on unmount. Swapping {@link EngineConfig} recreates
 * the opponent (and therefore the underlying Worker), since those are
 * captured at construction time. `reset()` forces a recreate without
 * changing config — used by the Retry-AI-move affordance to recover from
 * a dead Worker after a fatal error.
 *
 * The discriminated union lets the dispatch be exhaustive: Stockfish
 * branch reads `skillLevel`, Maia branch reads `rating` (applied to both
 * `selfElo` and `opponentElo` for the most "natural" play of a
 * self-rated player). New engines plug in by extending `EngineConfig`
 * and adding one factory branch here.
 */
export function useAiVersus(engineConfig: EngineConfig) {
  const [resetCounter, setResetCounter] = useState(0);
  const opponentRef = useRef<ChessOpponent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    let opponent: ChessOpponent;
    try {
      if (engineConfig.kind === 'maia') {
        const elo = maiaRatingToElo(engineConfig.rating);
        opponent = createMaiaOpponent({ selfElo: elo, opponentElo: elo });
      } else {
        opponent = createStockfishOpponent({ skillLevel: engineConfig.skillLevel });
      }
    } catch (error) {
      console.error('Failed to construct chess opponent:', error);
      return;
    }
    opponentRef.current = opponent;

    return () => {
      // Guard against clobbering a newer opponent: if another effect run has
      // already replaced `opponentRef`, leave that newer instance in place.
      if (opponentRef.current === opponent) {
        opponentRef.current = null;
      }
      void opponent.destroy();
    };
  }, [engineConfig, resetCounter]);

  const getAiMove = useCallback(
    async (
      moves: AlgebraicNotation[],
      startingFen?: string
    ): Promise<Result<AlgebraicNotation, AiMoveError>> => {
      const opponent = opponentRef.current;
      if (!opponent) {
        return err({ kind: 'not-initialized' });
      }

      const initialFen = startingFen ?? getStartingFen();
      const fen = getFenAfterMoves(initialFen, moves) as Fen;

      const result = await opponent.getBestMove({ fen, history: moves, startingFen });
      if (!result.ok) {
        return result;
      }
      try {
        return ok(uciToAlgebraic(result.value.move, fen));
      } catch (cause) {
        // uciToAlgebraic throws when the engine produced a move that is not
        // legal in `fen` (see the position-command TSDoc in ChessEngine for
        // how that can happen); surface it as a generation failure so the
        // orchestration's error path (Retry button) handles it.
        return err({ kind: 'move-generation-failed', cause });
      }
    },
    []
  );

  /**
   * Force the underlying opponent to be torn down and recreated. The new
   * opponent is constructed on the next effect run; consumers that call
   * `getAiMove` immediately after `reset()` will see the new instance
   * because React flushes effects before scheduling subsequent work.
   */
  const reset = useCallback(() => {
    setResetCounter((c) => c + 1);
  }, []);

  return { getAiMove, reset };
}
