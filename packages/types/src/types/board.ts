export const BOARD_ORIENTATIONS = ["white", "black", "random"] as const;
export type BoardOrientation = (typeof BOARD_ORIENTATIONS)[number];

export type BoardTheme = "monotone" | "lichess" | "chesscom";

export type BoardThemeColors = {
  light: string;
  dark: string;
  lightText: string;
  darkText: string;
};

/**
 * Canonical blindfold display-mode unions. The `as const` arrays are the
 * single runtime source of truth for validating untyped input (stored
 * preferences, JSONB play settings); the types derive from them so the two
 * can never drift.
 */
export const PIECE_SHAPE_MODES = [
  "normal",
  "circles-all",
  "circles-own",
  "circles-opponent",
] as const;
export type PieceShapeMode = (typeof PIECE_SHAPE_MODES)[number];

export const PIECE_COLOR_MODES = [
  "normal",
  "white-only",
  "black-only",
] as const;
export type PieceColorMode = (typeof PIECE_COLOR_MODES)[number];

/**
 * Partial blindfold: which pawns are hidden entirely. `'none'` shows every
 * pawn; `'all'` hides both sides'; `'own'` / `'opponent'` hide only that
 * side's pawns.
 */
export const PAWN_HIDE_MODES = ["none", "all", "own", "opponent"] as const;
export type PawnHideMode = (typeof PAWN_HIDE_MODES)[number];
