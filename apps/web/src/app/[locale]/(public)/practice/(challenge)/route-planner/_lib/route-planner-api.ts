/**
 * Local re-exports of the route-planner domain API from `@blindfold-chess/features`.
 * Apps should import from this module rather than reaching into the feature
 * package directly, which keeps the import surface stable if the underlying
 * symbols are renamed.
 */
export {
  coordsToSquare,
  findShortestPath,
  generateProblem,
  getPossibleMoves,
  isSameColor,
  isValidRoutePlannerSquare as isValidSquare,
  squareToCoords,
  validateUserPath,
} from '@blindfold-chess/features/route-planner';
