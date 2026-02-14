import type { PieceSymbol } from "chess.js";

import type { PieceType } from "./types";

// Map piece types to chess.js piece symbols
export const pieceSymbolMap: Record<PieceType, PieceSymbol> = {
  bishop: "b",
  knight: "n",
  rook: "r",
  queen: "q",
  king: "k",
};

// Get piece display symbol
export const pieceDisplayMap: Record<PieceType, string> = {
  bishop: "\u2657",
  knight: "\u2658",
  rook: "\u2656",
  queen: "\u2655",
  king: "\u2654",
};
