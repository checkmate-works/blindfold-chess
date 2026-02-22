import type { Color, PieceSymbol, Square } from "chess.js";

export type { Color, PieceSymbol, Square } from "chess.js";

export type BoardPiece = {
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null;

export type MoveResult = {
  san: string;
  from: Square;
  to: Square;
  color: Color;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  flags: string;
  before: string;
  after: string;
};
