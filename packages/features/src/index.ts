export * from "./board-symmetry";
export * from "./common";
export * from "./coordinate-quiz";
export {
  type DiagonalPair,
  type DiagonalQuizSettings,
  DEFAULT_DIAGONAL_QUIZ_SETTINGS,
  type DiagonalQuestionResult,
  type DiagonalQuizResult,
  getDiagonals,
  normalizeDiagonal,
  isValidDiagonalAnswer,
  getDiagonalSquares,
  getCornerInfo,
} from "./diagonal-quiz";
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
// Note: route-planner functions like generateProblem collide with board-symmetry.
// Use subpath import (@blindfold-chess/features/route-planner) for full access,
// or use the prefixed named exports below.
export {
  type RoutePlannerPieceType,
  ROUTE_PLANNER_PIECES,
  type RoutePlannerProblem,
  type RoutePlannerSettings,
  DEFAULT_ROUTE_PLANNER_SETTINGS,
  type RoutePlannerProblemResult,
  type RoutePlannerResult,
  isValidRoutePlannerSquare,
  generateProblem as generateRoutePlannerProblem,
  getPossibleMoves as getRoutePlannerPossibleMoves,
  findShortestPath as findRoutePlannerShortestPath,
  validateUserPath as validateRoutePlannerUserPath,
  isSameColor as isRoutePlannerSameColor,
} from "./route-planner";
