import type { Color, PieceSymbol, Square } from "chess.js";
import type { Move } from "chess.js";

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

export function toMoveResult(m: Move): MoveResult {
  return {
    san: m.san,
    from: m.from,
    to: m.to,
    color: m.color,
    piece: m.piece,
    captured: m.captured,
    promotion: m.promotion,
    flags: m.flags,
    before: m.before,
    after: m.after,
  };
}
