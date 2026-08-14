'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Side } from '@blindfold-chess/types';

import { resolveIllegalAttemptSquares } from '@/lib/games/illegal-attempts';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';

type Options = {
  /** The displayed move's aid-usage log, or null for an AI / unlogged move. */
  moveOperationLog: MoveOperationLog | null;
  playerColor: Side;
  /**
   * The displayed move's ply. Changing it clears the selection: attempt indices
   * are per-move, so a selection kept across a navigation would mark a square
   * belonging to an unrelated move.
   */
  currentPly: number | null;
};

export type UseIllegalAttemptSelectionReturn = {
  /** Which rejected attempt is currently pointed at, if any. */
  selectedAttemptIndex: number | null;
  /** The squares to mark on the board for the current selection; null when none. */
  illegalAttempt: { from?: string; to?: string } | null;
  /** Toggle: tapping the chip already on the board clears it. */
  handleAttemptSelect: (attemptIndex: number) => void;
  /** Whether an attempt resolves to markable squares (so the chip is clickable). */
  isAttemptSelectable: (attemptIndex: number) => boolean;
};

/**
 * "Which of this move's rejected attempts is being pointed at on the board."
 *
 * The attempt chips in the per-move panel and the board's illegal-attempt
 * marking are two views of one selection, and that selection is scoped to the
 * displayed move — hence the reset keyed on `currentPly`. Not every attempt can
 * be shown: a text-typed attempt may name no squares at all, so the panel asks
 * `isAttemptSelectable` before offering a chip as clickable.
 */
export function useIllegalAttemptSelection({
  moveOperationLog,
  playerColor,
  currentPly,
}: Options): UseIllegalAttemptSelectionReturn {
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedAttemptIndex(null);
  }, [currentPly]);

  const attemptSquaresAt = useCallback(
    (attemptIndex: number) =>
      moveOperationLog
        ? resolveIllegalAttemptSquares(moveOperationLog, attemptIndex, playerColor)
        : null,
    [moveOperationLog, playerColor]
  );

  const handleAttemptSelect = useCallback(
    (attemptIndex: number) =>
      setSelectedAttemptIndex((current) => (current === attemptIndex ? null : attemptIndex)),
    []
  );

  const isAttemptSelectable = useCallback(
    (attemptIndex: number) => attemptSquaresAt(attemptIndex) !== null,
    [attemptSquaresAt]
  );

  const illegalAttempt =
    selectedAttemptIndex != null ? attemptSquaresAt(selectedAttemptIndex) : null;

  return { selectedAttemptIndex, illegalAttempt, handleAttemptSelect, isAttemptSelectable };
}
