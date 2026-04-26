import type { Side } from "./chess";

export const BOARD_ORIENTATIONS = ["white", "black", "random"] as const;
export type BoardOrientation = (typeof BOARD_ORIENTATIONS)[number];

export type BoardTheme = "monotone" | "lichess" | "chesscom";

export type BoardThemeColors = {
  light: string;
  dark: string;
  lightText: string;
  darkText: string;
};

export type HighlightType = "none" | "last-move" | "selectable";

export type PieceShapeMode =
  | "normal"
  | "circles-all"
  | "circles-own"
  | "circles-opponent";
export type PieceColorMode = "normal" | "white-only" | "black-only";

export type ChessBoardBaseProps = {
  fen: string;
  flipped?: boolean;
  playerSide?: Side;
  lastMove?: { from: string; to: string } | null;
  highlightedSquares?: string[];
  showCoordinates?: boolean;
  showOwnPieces?: boolean;
  showOpponentPieces?: boolean;
  pieceShapeMode?: PieceShapeMode;
  pieceColors?: PieceColorMode;
  boardTheme?: BoardTheme;
};
