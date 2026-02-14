export * from "./board-symmetry";
export * from "./common";
export * from "./coordinate-quiz";
export * from "./legal-moves";
// Note: getSquareColor is exported only via subpath import (@blindfold-chess/features/square-colors)
// to avoid name collision with coordinate-quiz's getSquareColor
export {
  type SquareColor,
  type SquareColorsSettings,
  DEFAULT_SQUARE_COLORS_SETTINGS,
  type SquareColorsResult,
  isValidSquare,
} from "./square-colors";
