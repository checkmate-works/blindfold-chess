import type { PieceType } from "@blindfold-chess/icons";
import { ALL_PIECE_SYMBOLS, PROMOTION_PIECES } from "@blindfold-chess/types";

export { PROMOTION_PIECES };

export const PIECES = ALL_PIECE_SYMBOLS;

export const PIECE_TYPE_MAP: Record<(typeof PIECES)[number], PieceType> = {
  K: "k",
  Q: "q",
  R: "r",
  B: "b",
  N: "n",
};

export const PIECE_ICON_SIZE = 24;
