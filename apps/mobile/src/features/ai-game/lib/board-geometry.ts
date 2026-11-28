import { fileRankToSquare } from "@blindfold-chess/features/common";
import type { Square } from "@blindfold-chess/types";

/**
 * The square under a point on a drawn board, or null off the board.
 *
 * `x` / `y` are measured from the board's top-left corner, in the same units
 * as `boardSize`. The board is drawn from White's side (a8 top-left) unless
 * `flipped`, when h1 is top-left. A point exactly on the right or bottom edge
 * is outside: the last column and row end just before `boardSize`.
 */
export function squareAtPoint(
  x: number,
  y: number,
  boardSize: number,
  flipped: boolean,
): Square | null {
  if (!(boardSize > 0)) return null;
  if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return null;
  const squareSize = boardSize / 8;
  const column = Math.floor(x / squareSize);
  const row = Math.floor(y / squareSize);
  const fileIndex = flipped ? 7 - column : column;
  // `fileRankToSquare` counts ranks from rank 1; the drawn rows count from
  // the top, which is rank 8 on White's side.
  const rankIndex = flipped ? row : 7 - row;
  return fileRankToSquare(fileIndex, rankIndex);
}
