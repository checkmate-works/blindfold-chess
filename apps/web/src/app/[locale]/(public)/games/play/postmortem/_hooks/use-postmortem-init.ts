import { useEffect, useMemo, useState } from 'react';

import {
  getStartingFen,
  replayMoves,
  validateMoveSequence,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { parseFenMeta } from '../../_lib/fen-utils';
import { clearEvaluationCache } from '../_lib';

type UsePostmortemInitProps = {
  pgn: string;
  initialOffset: number;
  startingFen?: string;
};

type UsePostmortemInitReturn = {
  originalMoves: AlgebraicNotation[];
  currentMoveIndex: number;
  setCurrentMoveIndex: React.Dispatch<React.SetStateAction<number>>;
  userMoves: AlgebraicNotation[];
  setUserMoves: React.Dispatch<React.SetStateAction<AlgebraicNotation[]>>;
  isCompleted: boolean;
  setIsCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  startsAsBlack: boolean;
  startMoveNumber: number;
  gamePositions: ReturnType<typeof replayMoves>;
};

/**
 * Hook responsible for PGN parsing, move validation, and initial game state setup.
 */
export function usePostmortemInit({
  pgn,
  initialOffset,
  startingFen,
}: UsePostmortemInitProps): UsePostmortemInitReturn {
  const [originalMoves, setOriginalMoves] = useState<AlgebraicNotation[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialOffset);
  const [userMoves, setUserMoves] = useState<AlgebraicNotation[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Pre-compute starting position info from FEN
  const { startsAsBlack, startMoveNumber } = useMemo(
    () => parseFenMeta(startingFen),
    [startingFen]
  );

  // Parse PGN on mount and clear evaluation cache
  useEffect(() => {
    clearEvaluationCache();

    try {
      const cleanPgn = pgn.replace(/\d+\.\s*/g, '').replace(/\.\./g, '');
      const moves = cleanPgn.trim().split(/\s+/).filter(Boolean);

      const fen = startingFen ?? getStartingFen();
      const result = validateMoveSequence(fen, moves);
      const validMoves = result.validMoves as AlgebraicNotation[];

      setOriginalMoves(validMoves);

      if (initialOffset > 0 && initialOffset <= validMoves.length) {
        const restoredMoves = validMoves.slice(0, initialOffset);
        setUserMoves(restoredMoves);

        if (initialOffset >= validMoves.length) {
          setIsCompleted(true);
        }
      }
    } catch (error) {
      console.error('Error parsing PGN:', error);
    }
  }, [pgn, initialOffset, startingFen]);

  // Pre-compute all game positions
  const gamePositions = useMemo(() => {
    return replayMoves(originalMoves as string[], startingFen);
  }, [originalMoves, startingFen]);

  // Update URL with current offset
  useEffect(() => {
    if (originalMoves.length > 0 && currentMoveIndex > 0) {
      const params = new URLSearchParams(window.location.search);
      params.set('offset', currentMoveIndex.toString());
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentMoveIndex, originalMoves.length]);

  return {
    originalMoves,
    currentMoveIndex,
    setCurrentMoveIndex,
    userMoves,
    setUserMoves,
    isCompleted,
    setIsCompleted,
    startsAsBlack,
    startMoveNumber,
    gamePositions,
  };
}
