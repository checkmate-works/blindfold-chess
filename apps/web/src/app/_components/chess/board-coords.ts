import {
  BOARD_LAST_INDEX,
  DISPLAY_RANKS,
  FILES,
  flipIndex,
} from '@blindfold-chess/features/common';

/**
 * Convert an algebraic square name (e.g. "f5") to its cell position on the
 * rendered board, expressed in the **visual grid** — where `col` increases
 * left→right as rendered and `row` increases top→bottom as rendered, both
 * in `0..7`.
 *
 * When `flipped` is true the board is drawn from Black's point of view
 * (rank 1 at the top, h-file on the left), so the file/rank indices must
 * be inverted to match the visual cell — otherwise a piece lands on the
 * point-symmetric square (the a1↔h8 rotation of the correct square), e.g.
 * `f5` would be drawn at where `c4` appears.
 *
 * This is the single source of truth for the `(square, flipped)` →
 * `(visualCol, visualRow)` mapping. Both the static board (`BoardLayout`,
 * via `getVisualCellSquare` — the inverse direction) and the animation
 * overlay (`usePieceAnimation`, via `getSquarePixelOffset` — a pixel-scaled
 * wrapper) go through this definition so that the two representations
 * cannot drift.
 *
 * @param square - Algebraic square name like "e4"
 * @param flipped - True when the board is drawn from Black's perspective
 * @returns Visual grid cell `{ col, row }`, each in `0..7`
 */
export function getSquareVisualCell(
  square: string,
  flipped: boolean
): { col: number; row: number } {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;

  const col = flipIndex(file, flipped);
  const row = flipIndex(BOARD_LAST_INDEX - rank, flipped);

  return { col, row };
}

/**
 * Inverse of {@link getSquareVisualCell}: given a visual grid cell
 * `(col, row)` and the board orientation, return the logical file/rank
 * indices and the algebraic square name.
 *
 * `fileIndex` is `0..7` for files `a..h` and `rankIndex` is `0..7` indexing
 * into `DISPLAY_RANKS` (so `rankIndex=0` is rank 8, `rankIndex=7` is rank 1) —
 * the logical coordinate space used by callers of `BoardLayout`.
 *
 * @param col - Visual column `0..7`, increases left→right as rendered
 * @param row - Visual row `0..7`, increases top→bottom as rendered
 * @param flipped - True when the board is drawn from Black's perspective
 */
export function getVisualCellSquare(
  col: number,
  row: number,
  flipped: boolean
): { fileIndex: number; rankIndex: number; file: string; rank: string; square: string } {
  const fileIndex = flipIndex(col, flipped);
  const rankIndex = flipIndex(row, flipped);
  const file = FILES[fileIndex];
  const rank = DISPLAY_RANKS[rankIndex];

  return { fileIndex, rankIndex, file, rank, square: `${file}${rank}` };
}
