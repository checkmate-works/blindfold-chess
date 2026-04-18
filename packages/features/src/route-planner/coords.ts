import {
  fileRankToSquare,
  isValidSquare,
  squareToFileIndex,
  squareToRankIndex,
} from "../common";

export function squareToCoords(square: string): [number, number] {
  return [squareToFileIndex(square), squareToRankIndex(square)];
}

export function coordsToSquare(file: number, rank: number): string {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return "";
  return fileRankToSquare(file, rank);
}

export { isValidSquare as isValidRoutePlannerSquare };

export function isSameColor(sq1: string, sq2: string): boolean {
  const [f1, r1] = squareToCoords(sq1);
  const [f2, r2] = squareToCoords(sq2);
  return (f1 + r1) % 2 === (f2 + r2) % 2;
}
