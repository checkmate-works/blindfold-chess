import {
  fileRankToSquare,
  isValidSquare,
  squareToFileIndex,
  squareToRankIndex,
} from "../common";
import { BOARD_LAST_INDEX } from "../common/constants";

export function squareToCoords(square: string): [number, number] {
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

export function isSameColor(sq1: string, sq2: string): boolean {
  const [f1, r1] = squareToCoords(sq1);
  const [f2, r2] = squareToCoords(sq2);
  return (f1 + r1) % 2 === (f2 + r2) % 2;
}
