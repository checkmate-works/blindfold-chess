import type {
  AlgebraicNotation,
  PieceType,
  Square,
} from "@blindfold-chess/types";
import type { Move } from "chess.js";

export type Color = "w" | "b";

export type BoardPiece = {
  square: Square;
  type: PieceType;
  color: Color;
} | null;

export type MoveResult = {
  san: AlgebraicNotation;
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

/**
 * Trust boundary for SAN produced BY chess.js (never for user input).
 * chess.js emits canonical SAN, which the template-literal
 * {@link AlgebraicNotation} type describes; this is the single place that
 * guarantee is asserted, so everything downstream stays cast-free.
 */
export function asEngineSan(san: string): AlgebraicNotation {
  return san as AlgebraicNotation;
}

export function toMoveResult(m: Move): MoveResult {
  return {
    san: asEngineSan(m.san),
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
