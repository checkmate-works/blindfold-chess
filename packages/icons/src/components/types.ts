import type { PieceType } from "../data/chess-pieces";
import type { PieceColor } from "../data/types";

export type SpinnerIconProps = {
  size?: number;
  color?: string;
};

export type ChessPieceIconProps = {
  type: PieceType;
  color: PieceColor;
  size?: number;
};

export type StrokeIconProps = {
  size?: number;
  color?: string;
};
