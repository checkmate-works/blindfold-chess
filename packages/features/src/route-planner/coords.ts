import type { Square } from "@blindfold-chess/types";

import {
  computeSquareColor,
  fileRankToSquare,
  isValidSquare,
  squareToFileIndex,
  squareToRankIndex,
} from "../common";
import { BOARD_LAST_INDEX } from "../common/constants";

/** `[fileIndex, rankIndex]`, both 0-based from a1 (`"a1"` → `[0, 0]`). */
export function squareToCoords(square: Square): [number, number] {
  return [squareToFileIndex(square), squareToRankIndex(square)];
}

/** Inverse of {@link squareToCoords}; returns `""` (not a throw) for off-board indices. */
export function coordsToSquare(file: number, rank: number): string {
  if (
    file < 0 ||
    file > BOARD_LAST_INDEX ||
    rank < 0 ||
    rank > BOARD_LAST_INDEX
  )
    return "";
  return fileRankToSquare(file, rank);
}

export { isValidSquare as isValidRoutePlannerSquare };

export function isSameColor(sq1: Square, sq2: Square): boolean {
  return computeSquareColor(sq1) === computeSquareColor(sq2);
}
