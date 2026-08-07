"use client";

import { useCallback, useState } from "react";

import type { Square } from "@blindfold-chess/types";

import { isValidSquare } from "../common";

export type UseRoutePlannerInputConfig = {
  /** Freeze input (while the result is showing or during the countdown). */
  disabled: boolean;
};

export type UseRoutePlannerInputReturn = {
  /** Squares entered so far (excluding the start square). */
  moves: Square[];
  /** The file picked in the two-step file→rank square picker, if any. */
  selectedFile: string | null;
  handleFilePress: (file: string) => void;
  handleRankPress: (rank: string) => void;
  handleUndo: () => void;
  /** Replace the entered moves wholesale (e.g. with the scored final path). */
  replaceMoves: (moves: Square[]) => void;
  /** Clear all input for the next problem. */
  reset: () => void;
};

/**
 * Two-step square-picker input state for the route planner: tapping a file
 * arms it (tapping again disarms), tapping a rank completes the square and
 * appends it to the move list.
 */
export function useRoutePlannerInput({
  disabled,
}: UseRoutePlannerInputConfig): UseRoutePlannerInputReturn {
  const [moves, setMoves] = useState<Square[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFilePress = useCallback(
    (file: string) => {
      if (disabled) return;
      setSelectedFile((prev) => (prev === file ? null : file));
    },
    [disabled],
  );

  const handleRankPress = useCallback(
    (rank: string) => {
      if (disabled || !selectedFile) return;
      const square = `${selectedFile}${rank}`;
      if (!isValidSquare(square)) return;
      setMoves((prev) => [...prev, square]);
      setSelectedFile(null);
    },
    [disabled, selectedFile],
  );

  const handleUndo = useCallback(() => {
    if (disabled || moves.length === 0) return;
    setMoves((prev) => prev.slice(0, -1));
    setSelectedFile(null);
  }, [disabled, moves.length]);

  const replaceMoves = useCallback((next: Square[]) => {
    setMoves(next);
  }, []);

  const reset = useCallback(() => {
    setMoves([]);
    setSelectedFile(null);
  }, []);

  return {
    moves,
    selectedFile,
    handleFilePress,
    handleRankPress,
    handleUndo,
    replaceMoves,
    reset,
  };
}
