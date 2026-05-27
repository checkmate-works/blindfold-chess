export const BOARD_ORIENTATIONS = ["white", "black", "random"] as const;
export type BoardOrientation = (typeof BOARD_ORIENTATIONS)[number];

export type BoardTheme = "monotone" | "lichess" | "chesscom";

export type BoardThemeColors = {
  light: string;
  dark: string;
  lightText: string;
  darkText: string;
};

export type PieceShapeMode =
  | "normal"
  | "circles-all"
  | "circles-own"
  | "circles-opponent";
