import type { PieceType } from "@blindfold-chess/icons";
import { ALL_PIECE_SYMBOLS } from "@blindfold-chess/types";

export const PIECES = ALL_PIECE_SYMBOLS;
export const PROMOTION_PIECES = ["q", "r", "b", "n"] as const;

export const PIECE_TYPE_MAP: Record<(typeof PIECES)[number], PieceType> = {
  K: "k",
  Q: "q",
  R: "r",
  B: "b",
  N: "n",
};

export const PIECE_ICON_SIZE = 24;
