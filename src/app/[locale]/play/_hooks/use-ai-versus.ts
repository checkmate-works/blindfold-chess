import { useEffect, useRef, useCallback } from 'react';
import { getChessEngine } from '../_lib/chess-engine';
import type { AlgebraicNotation, SkillLevel } from '@/lib/types';

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
    const setSkill = async () => {
      const engine = engineRef.current;
      if (!engine) return;

      // Wait for engine to be ready before setting skill level
      let retries = 0;
      const maxRetries = 100;

      while (!engine.isReady && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }

      if (engine.isReady) {
        await engine.setSkillLevel(skillLevel);
      }
    };

    setSkill();

    return () => {
      // Note: We don't destroy the singleton engine here as it's shared
      // destroyChessEngine();
    };
  }, [skillLevel]);

  const getAiMove = useCallback(async (moves: AlgebraicNotation[]): Promise<AlgebraicNotation> => {
    const engine = engineRef.current;
    if (!engine) {
      throw new Error('Chess engine not available');
    }

    // Wait for engine to be ready
    let retries = 0;
    const maxRetries = 100; // 10 seconds max

    while (!engine.isReady && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!engine.isReady) {
      throw new Error('Engine initialization timeout');
    }

    // Create a fresh chess instance to calculate current position
    const { Chess } = await import('chess.js');
    const chess = new Chess();

    // Replay all moves to get current position
    for (const move of moves) {
      chess.move(move);
    }

    const fen = chess.fen();
    const uciMove = await engine.getBestMove(fen, moves);
    const aiMove = engine.convertUciToAlgebraic(uciMove, fen);

    return aiMove;
  }, []);

  return { getAiMove };
}
