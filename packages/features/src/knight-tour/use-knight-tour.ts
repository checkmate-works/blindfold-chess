"use client";

import { useCallback, useMemo, useState } from "react";

import { getAvailableKnightMoves } from "./knight-tour";
import {
  EMPTY_KNIGHT_TOUR_STATE,
  type KnightTourState,
  applyKnightMove,
  createKnightTourState,
  undoKnightMove,
} from "./tour-state";

export type UseKnightTourConfig = {
  /**
   * Start the tour on this square at mount. Omit it to start later with
   * `start()` (the web screen starts from an effect once its query string
   * is read).
   */
  initialStartingSquare?: string;
};

export type UseKnightTourReturn = KnightTourState & {
  /** Unvisited squares a knight move away from the current square. */
  availableMoves: string[];
  /** Whether there is a move after the starting square to take back. */
  canUndo: boolean;
  /** (Re)start the tour on `square`, discarding any progress. */
  start: (square: string) => void;
  /**
   * Move to `target`. Returns the new state, or `null` when the move was
   * rejected (not a knight move, or the square is already visited), so the
   * caller can react to completion synchronously.
   */
  move: (target: string) => KnightTourState | null;
  undo: () => void;
};

/**
 * The state of one Knight's Tour attempt, shared by the web and mobile
 * session screens. The rules are the pure transitions in `tour-state.ts`;
 * this hook only holds the current state between renders.
 */
export function useKnightTour({
  initialStartingSquare,
}: UseKnightTourConfig = {}): UseKnightTourReturn {
  const [state, setState] = useState<KnightTourState>(() =>
    initialStartingSquare
      ? createKnightTourState(initialStartingSquare)
      : EMPTY_KNIGHT_TOUR_STATE,
  );

  const start = useCallback((square: string) => {
    setState(createKnightTourState(square));
  }, []);

  const move = useCallback(
    (target: string) => {
      const next = applyKnightMove(state, target);
      if (next === state) return null;
      setState(next);
      return next;
    },
    [state],
  );

  const undo = useCallback(() => {
    setState(undoKnightMove);
  }, []);

  const availableMoves = useMemo(
    () => getAvailableKnightMoves(state.currentSquare, state.visitedSquares),
    [state.currentSquare, state.visitedSquares],
  );

  return {
    ...state,
    availableMoves,
    canUndo: state.moveHistory.length > 1,
    start,
    move,
    undo,
  };
}
