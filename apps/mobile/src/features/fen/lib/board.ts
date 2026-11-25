import { useCallback, useState } from "react";
import { fenToBoardFlat } from "@blindfold-chess/features/chess-core/fen";

/** True when no square of `fen` holds a piece. */
export function isBoardEmpty(fen: string): boolean {
  return fenToBoardFlat(fen).every((piece) => piece === "");
}

/**
 * The recreation board's orientation: each problem opens from its side to
 * move, as the web's does, and the player may flip it while rebuilding. A
 * flip belongs to the problem it was made on, so the next problem opens
 * the right way up again without an effect resetting it.
 */
export function useProblemOrientation(
  problemIndex: number,
  blackToMove: boolean,
): [flipped: boolean, toggle: () => void] {
  const [flip, setFlip] = useState({ index: -1, flipped: false });
  const toggled = flip.index === problemIndex && flip.flipped;
  const toggle = useCallback(
    () =>
      setFlip((prev) => ({
        index: problemIndex,
        flipped: prev.index === problemIndex ? !prev.flipped : true,
      })),
    [problemIndex],
  );
  return [blackToMove !== toggled, toggle];
}
