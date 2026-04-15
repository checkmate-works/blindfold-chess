/**
 * Deprecated barrel. Responsibility-named modules live alongside this file:
 *
 * - `./pieces`            — `PIECES`, `PieceType`, `RoutePlannerPieceSelection`
 * - `./query-params`      — `PIECE_TYPE_TO_NAME`, `PIECE_NAME_TO_TYPE`,
 *                           `VALID_PIECE_NAMES`, `ValidPieceName`
 * - `./route-planner-api` — thin re-export layer over
 *                           `@blindfold-chess/features/route-planner`
 *
 * Prefer importing directly from those modules in new code. This barrel is
 * kept only so existing imports resolve during the migration window.
 */
export { type PieceType, PIECES, type RoutePlannerPieceSelection } from './pieces';
export {
  PIECE_NAME_TO_TYPE,
  PIECE_TYPE_TO_NAME,
  VALID_PIECE_NAMES,
  type ValidPieceName,
} from './query-params';
export {
  coordsToSquare,
  findShortestPath,
  generateProblem,
  getPossibleMoves,
  isSameColor,
  isValidSquare,
  squareToCoords,
  validateUserPath,
} from './route-planner-api';
