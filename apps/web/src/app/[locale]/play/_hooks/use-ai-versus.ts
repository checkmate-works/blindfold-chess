import { useCallback, useEffect, useRef } from 'react';

import { getFenAfterMoves, getStartingFen } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { SkillLevel } from '@/lib/types';

import { getChessEngine } from '../_lib/chess-engine';

export function useAiVersus(skillLevel: SkillLevel) {
  const engineRef = useRef<ReturnType<typeof getChessEngine> | null>(null);

  // Initialize engine only in browser environment
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        engineRef.current = getChessEngine();
      } catch (error) {
        console.error('Failed to initialize chess engine:', error);
      }
    }
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    // setSkillLevel stores the level immediately; the actual UCI commands
    // are sent once the engine worker is created (during ensureInitialized)
    engine.setSkillLevel(skillLevel);
  }, [skillLevel]);

  const getAiMove = useCallback(
    async (moves: AlgebraicNotation[], startingFen?: string): Promise<AlgebraicNotation> => {
      const engine = engineRef.current;
      if (!engine) {
        throw new Error('Chess engine not available');
      }

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
