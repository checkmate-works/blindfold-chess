import type { PieceType } from "./types";

// Get piece display symbol
export const pieceDisplayMap: Record<PieceType, string> = {
  b: "\u2657",
  n: "\u2658",
  r: "\u2656",
  q: "\u2655",
  k: "\u2654",
};
