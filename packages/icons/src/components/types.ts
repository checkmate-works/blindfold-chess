import type { PieceType } from "../data/chess-pieces";
import type { PieceColor, RatingFaceLevel } from "../data/types";

export type SpinnerIconProps = {
  size?: number;
  color?: string;
};

export type ChessPieceIconProps = {
  type: PieceType;
  color: PieceColor;
  /** Width and height. Defaults to 45 (the artwork's native size), not the 24 the other icons use. */
  size?: number;
};

export type StrokeIconProps = {
  size?: number;
  color?: string;
};

export type RatingFaceIconProps = {
  level: RatingFaceLevel;
  size?: number;
  /** Replaces the head's fill only; the eyes, brows and mouth keep their fixed colour. */
  faceColor?: string;
};

/**
 * The coin icon's golden palette is intrinsic to the artwork (it depicts a
 * coin), so unlike the stroke icons it takes no `color` prop — only `size`.
 */
export type CoinIconProps = {
  size?: number;
};
