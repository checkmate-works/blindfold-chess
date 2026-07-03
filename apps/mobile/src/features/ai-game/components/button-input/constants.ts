import type { PieceType } from "@blindfold-chess/icons";

export const PIECES = ["K", "Q", "R", "B", "N"] as const;
export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
export const PROMOTION_PIECES = ["q", "r", "b", "n"] as const;

export const PIECE_TYPE_MAP: Record<(typeof PIECES)[number], PieceType> = {
  K: "k",
  Q: "q",
  R: "r",
  B: "b",
  N: "n",
};

export const PIECE_ICON_SIZE = 24;
