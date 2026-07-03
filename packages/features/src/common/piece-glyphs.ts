import type { PieceType } from "@blindfold-chess/types";

/**
 * Piece letters that have a display glyph (every piece except the pawn).
 */
export type DisplayPieceType = Extract<PieceType, "b" | "n" | "r" | "q" | "k">;

/**
 * Unicode chess figurine glyphs (white-piece codepoints U+2654–U+2658),
 * keyed by piece letter. Canonical source for piece display symbols across
 * web and mobile.
 */
export const PIECE_DISPLAY_MAP: Record<DisplayPieceType, string> = {
  b: "♗",
  n: "♘",
  r: "♖",
  q: "♕",
  k: "♔",
};
