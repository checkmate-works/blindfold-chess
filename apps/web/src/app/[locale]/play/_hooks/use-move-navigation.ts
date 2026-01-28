import { useCallback, useMemo, useState } from 'react';

import type { AlgebraicNotation } from '@blindfold-chess/core';
import { Chess } from 'chess.js';

type UseMoveNavigationProps = {
  moves: AlgebraicNotation[];
  startingFen?: string;
};

type UseMoveNavigationReturn = {
  currentPosition: number;
  displayFen: string | null;
  navigateToPosition: (position: number) => void;
  navigateToStart: () => void;
  navigatePrevious: () => void;
  navigateNext: () => void;
  navigateToEnd: () => void;
  resetNavigation: () => void;
  latestFen: string;
};

export function useMoveNavigation({
  moves,
  startingFen,
}: UseMoveNavigationProps): UseMoveNavigationReturn {
  const [currentPosition, setCurrentPosition] = useState<number>(-1); // -1 means latest position
  const [displayFen, setDisplayFen] = useState<string | null>(null);

  // Helper to calculate FEN at a specific position
  const getFenAtPosition = useCallback(
    (position: number): string => {
      const chess = startingFen ? new Chess(startingFen) : new Chess();

      // If position is -2 (start), return initial FEN
      if (position === -2) {
        return chess.fen();
      }

      // If position is -1 (end), apply all moves
      // Otherwise apply up to position
      const movesToApply =
        position === -1 ? moves : position === -2 ? [] : moves.slice(0, position + 1);

      try {
        for (const move of movesToApply) {
          chess.move(move);
        }
        return chess.fen();
      } catch (error) {
        console.error('Error calculating FEN:', error);
        return startingFen || new Chess().fen();
      }
    },
    [moves, startingFen]
  );

  const navigateToPosition = useCallback(
    (position: number) => {
      // Bounds check
      // -2 is valid (start)
      // -1 is valid (end)
      // 0 to moves.length - 1 are valid indices
      if (position < -2 || (position >= moves.length && moves.length > 0)) {
        // Reset to latest if out of bounds
        setCurrentPosition(-1);
        setDisplayFen(null);
        return;
      }

      if (position === -1) {
        setCurrentPosition(-1);
        setDisplayFen(null);
      } else {
        setCurrentPosition(position);
        setDisplayFen(getFenAtPosition(position));
      }
    },
    [moves.length, getFenAtPosition]
  );

  const navigateToStart = useCallback(() => {
    setCurrentPosition(-2);
    setDisplayFen(getFenAtPosition(-2));
  }, [getFenAtPosition]);

  const navigateToEnd = useCallback(() => {
    setCurrentPosition(-1);
    setDisplayFen(null);
  }, []);

  const navigatePrevious = useCallback(() => {
    if (currentPosition === -2) return; // Already at start

    let targetPos: number;

    if (currentPosition === -1) {
      // From latest position
      if (moves.length === 0) return;
      targetPos = moves.length - 2;
    } else {
      // From specific position
      targetPos = currentPosition - 1;
    }

    if (targetPos < 0) {
      navigateToStart();
    } else {
      navigateToPosition(targetPos);
    }
  }, [currentPosition, moves.length, navigateToPosition, navigateToStart]);

  const navigateNext = useCallback(() => {
    if (currentPosition === -1) return; // Already at end

    let targetPos: number;

    if (currentPosition === -2) {
      // From start position
      if (moves.length === 0) return;
      targetPos = 0;
    } else {
      // From specific position
      targetPos = currentPosition + 1;
    }

    if (targetPos >= moves.length) {
      navigateToEnd();
    } else {
      navigateToPosition(targetPos);
    }
  }, [currentPosition, moves.length, navigateToPosition, navigateToEnd]);

  const resetNavigation = useCallback(() => {
    setCurrentPosition(-1);
    setDisplayFen(null);
  }, []);

  // Calculate latest FEN
  // We use useMemo to avoid recalculating on every render, only when moves change
  // This is efficient and safe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const latestFen = useMemo(() => getFenAtPosition(-1), [moves, startingFen]);

  return {
    currentPosition,
    displayFen,
    navigateToPosition,
    navigateToStart,
    navigatePrevious,
    navigateNext,
    navigateToEnd,
    resetNavigation,
    latestFen,
  };
}
