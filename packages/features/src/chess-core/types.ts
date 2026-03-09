import type { PieceType, Square } from "@blindfold-chess/types";
import type { Move } from "chess.js";

export type Color = "w" | "b";

export type BoardPiece = {
  square: Square;
  type: PieceType;
  color: Color;
} | null;

export type MoveResult = {
  san: string;
  from: Square;
  to: Square;
  color: Color;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  flags: string;
  before: string;
  after: string;
};

export function toMoveResult(m: Move): MoveResult {
  return {
    san: m.san,
    from: m.from as Square,
    to: m.to as Square,
    color: m.color as Color,
    piece: m.piece as PieceType,
    captured: m.captured as PieceType | undefined,
    promotion: m.promotion as PieceType | undefined,
    flags: m.flags,
    before: m.before,
    after: m.after,
  };
}
