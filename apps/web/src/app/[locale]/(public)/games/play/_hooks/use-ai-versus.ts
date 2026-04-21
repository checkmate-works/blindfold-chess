import { useCallback, useEffect } from 'react';

import { getFenAfterMoves, getStartingFen } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { SkillLevel } from '@/lib/types';

import { getChessEngine } from '../_lib/chess-engine';

export function useAiVersus(skillLevel: SkillLevel) {
  // Pre-warm the singleton on mount so Worker / WASM boot is hidden behind the
  // player's first move. Each engine invocation below re-acquires the
  // singleton via `getChessEngine()`, so the retry path (which tears the
  // singleton down via `resetChessEngine()`) can actually observe a fresh
  // instance — caching the reference here would defeat that.
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        getChessEngine();
      } catch (error) {
        console.error('Failed to initialize chess engine:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    let engine: ReturnType<typeof getChessEngine>;
    try {
      engine = getChessEngine();
    } catch (error) {
      console.error('Failed to acquire chess engine for skill level update:', error);
      return;
    }

    // setSkillLevel stores the level immediately; the actual UCI commands
    // are sent once the engine worker is created (during ensureInitialized)
    engine.setSkillLevel(skillLevel);
  }, [skillLevel]);

  const getAiMove = useCallback(
    async (moves: AlgebraicNotation[], startingFen?: string): Promise<AlgebraicNotation> => {
      // Re-acquire the singleton on every call so that `resetChessEngine()`
      // (invoked by the Retry affordance) actually takes effect — otherwise a
      // cached reference would keep pointing at the torn-down instance.
      const engine = getChessEngine();

      // getBestMove() calls ensureInitialized() internally,
      // so no need to poll isReady here

      // Calculate current position FEN via chess-core
      const initialFen = startingFen ?? getStartingFen();
      const fen = getFenAfterMoves(initialFen, moves);
      // For custom starting positions, we need to pass the moves relative to that position
      const uciMove = await engine.getBestMove(fen, moves, 1000, startingFen);
      const aiMove = engine.convertUciToAlgebraic(uciMove, fen);

      return aiMove;
    },
    []
  );

  return { getAiMove };
}
