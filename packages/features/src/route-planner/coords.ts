import type { Square } from "@blindfold-chess/types";

import {
  computeSquareColor,
  fileRankToSquare,
  isValidSquare,
  squareToFileIndex,
  squareToRankIndex,
} from "../common";
import { BOARD_LAST_INDEX } from "../common/constants";

export function squareToCoords(square: Square): [number, number] {
  return [squareToFileIndex(square), squareToRankIndex(square)];
}

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
