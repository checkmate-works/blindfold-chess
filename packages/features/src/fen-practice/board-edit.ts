import {
  boardFlatToFen,
  fenToBoardFlat,
  squareToBoardIndex,
} from "../chess-core/fen-pure";

/**
 * Empty-board FEN the recreation board starts from. It has no kings, so it
 * fails a legal-position check; the board editors treat it as a known-good
 * reset value rather than validating it.
 */
export const EMPTY_BOARD_FEN = "8/8/8/8/8/8/8/8 w - - 0 1";

/** The twelve FEN piece letters, White first, in palette order. */
export const PALETTE_PIECES = [
  "K",
  "Q",
  "R",
  "B",
  "N",
  "P",
  "k",
  "q",
  "r",
  "b",
  "n",
  "p",
] as const;

export type PalettePiece = (typeof PALETTE_PIECES)[number];

/**
 * Put `piece` on `square`, or empty the square when `piece` is null. The
 * side-to-move and later FEN fields are kept from `fen`, so editing the
 * placement never changes whose turn it is.
 *
 * Returns `fen` unchanged when `square` is not a board square.
 */
export function setSquarePiece(
  fen: string,
  square: string,
  piece: PalettePiece | null,
): string {
  const index = squareToBoardIndex(square);
  if (index === null) return fen;
  const board = fenToBoardFlat(fen);
  board[index] = piece ?? "";
  return boardFlatToFen(board, { preserveFrom: fen });
}

/**
 * What a tap on `square` does with the palette selection `selected`: place
 * the selected piece, or — when the same piece is already there, or nothing
 * is selected (the eraser) — empty the square. Tapping twice with one piece
 * therefore toggles it, which is the quickest correction on a phone.
 */
export function applyBoardTap(
  fen: string,
  square: string,
  selected: PalettePiece | null,
): string {
  const index = squareToBoardIndex(square);
  if (index === null) return fen;
  const current = fenToBoardFlat(fen)[index];
  if (selected === null || current === selected) {
    return setSquarePiece(fen, square, null);
  }
  return setSquarePiece(fen, square, selected);
}
