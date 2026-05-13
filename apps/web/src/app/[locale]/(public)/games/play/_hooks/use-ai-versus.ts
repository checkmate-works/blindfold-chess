import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChessOpponent, OpponentError } from '@blindfold-chess/features/ai-game/opponent';
import {
  getFenAfterMoves,
  getStartingFen,
  uciToAlgebraic,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Fen } from '@blindfold-chess/types';

import { createStockfishOpponent } from '@/lib/engines';
import type { SkillLevel } from '@/lib/types';

/**
 * Translate a domain {@link OpponentError} into a thrown `Error` so that
 * upstream React orchestration code (which already speaks in throws) does
 * not need to learn about `Result`. The hook acts as the boundary between
 * the domain layer (returns `Result`) and React effects (consume throws).
 *
 * Marked `never` so TypeScript enforces exhaustive handling at compile time.
 */
function throwOpponentError(error: OpponentError): never {
  switch (error.kind) {
    case 'opponent-destroyed':
      throw new Error('Chess opponent has been destroyed');
    case 'move-generation-failed':
    case 'initialization-failed': {
      const cause = error.cause;
      if (cause instanceof Error) throw cause;
      throw new Error(`Chess opponent error (${error.kind}): ${String(cause)}`);
    }
  }
}

/**
 * Drives an AI opponent for the human-vs-AI game flow.
 *
 * Lifecycle is owned per mount: a fresh {@link ChessOpponent} is created on
 * mount and torn down on unmount. Skill-level changes recreate the opponent
 * (and therefore the underlying Worker), since skill-level is captured at
 * construction time. `reset()` forces a recreate without changing skill-
 * level — used by the Retry-AI-move affordance to recover from a dead
 * Worker after a fatal error.
 */
export function useAiVersus(skillLevel: SkillLevel) {
  const [resetCounter, setResetCounter] = useState(0);
  const opponentRef = useRef<ChessOpponent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    let opponent: ChessOpponent;
    try {
      opponent = createStockfishOpponent({ skillLevel });
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
  }, [skillLevel, resetCounter]);

  const getAiMove = useCallback(
    async (moves: AlgebraicNotation[], startingFen?: string): Promise<AlgebraicNotation> => {
      const opponent = opponentRef.current;
      if (!opponent) {
        throw new Error('Chess opponent is not initialized');
      }

      const initialFen = startingFen ?? getStartingFen();
      const fen = getFenAfterMoves(initialFen, moves) as Fen;

      const result = await opponent.getBestMove({ fen, history: moves, startingFen });
      if (!result.ok) {
        throwOpponentError(result.error);
      }
      return uciToAlgebraic(result.value.move, fen) as AlgebraicNotation;
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
