import { useEffect, useMemo, useState } from 'react';

import {
  getStartingFen,
  replayMoves,
  validateMoveSequence,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

type UseRecallInitProps = {
  pgn: string;
  /**
   * Pre-parsed SAN move list, taking precedence over `pgn` when present. Lets
   * callers that already have a clean move array (e.g. `parsePgnWithFen`)
   * skip the regex-based `pgn` cleanup below entirely, which only handles
   * plain movetext and mis-parses a leading black-to-move segment (an
   * `"N.."`-style prefix collapses to a stray `"."` token).
   */
  moves?: AlgebraicNotation[];
  initialOffset: number;
  startingFen?: string;
};

type UseRecallInitReturn = {
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
export function useRecallInit({
  pgn,
  moves: preParsedMoves,
  initialOffset,
  startingFen,
}: UseRecallInitProps): UseRecallInitReturn {
  const [originalMoves, setOriginalMoves] = useState<AlgebraicNotation[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialOffset);
  const [userMoves, setUserMoves] = useState<AlgebraicNotation[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Pre-compute starting position info from FEN
  const { startsAsBlack, startMoveNumber } = useMemo(
    () => parseFenMeta(startingFen),
    [startingFen]
  );

  // Parse PGN on mount
  useEffect(() => {
    try {
      const moves =
        preParsedMoves ??
        pgn
          .replace(/\d+\.\s*/g, '')
          .replace(/\.\./g, '')
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      const fen = startingFen ?? getStartingFen();
      const result = validateMoveSequence(fen, moves);
      const validMoves = result.validMoves;

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
  }, [pgn, preParsedMoves, initialOffset, startingFen]);

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
