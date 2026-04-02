import type { RoutePlannerPieceType } from '@blindfold-chess/features/route-planner';

export {
  type RoutePlannerPieceType as PieceType,
  squareToCoords,
  coordsToSquare,
  isValidRoutePlannerSquare as isValidSquare,
  getPossibleMoves,
  findShortestPath,
  validateUserPath,
  isSameColor,
  generateProblem,
} from '@blindfold-chess/features/route-planner';

/** Pieces available for route-planner practice (knight and bishop only). */
export const PIECES: RoutePlannerPieceType[] = ['n', 'b'];

/** Single-select piece option: knight or bishop. */
export type RoutePlannerPieceSelection = RoutePlannerPieceType;

/** Map from short piece code to full piece name (for URL params). */
export const PIECE_TYPE_TO_NAME: Record<string, string> = {
  n: 'knight',
  b: 'bishop',
};

/** Map from full piece name to short piece code. */
export const PIECE_NAME_TO_TYPE: Record<string, RoutePlannerPieceType> = {
  knight: 'n',
  bishop: 'b',
};
