import type { RoutePlannerPieceType } from '@blindfold-chess/features/route-planner';

import { PIECE_NAME_TO_SHORT, PIECE_SHORT_TO_NAME } from '@/lib/chess-pieces';

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
  n: PIECE_SHORT_TO_NAME.n,
  b: PIECE_SHORT_TO_NAME.b,
};

/** Map from full piece name to short piece code. */
export const PIECE_NAME_TO_TYPE: Record<string, RoutePlannerPieceType> = {
  knight: PIECE_NAME_TO_SHORT.knight as RoutePlannerPieceType,
  bishop: PIECE_NAME_TO_SHORT.bishop as RoutePlannerPieceType,
};

/**
 * Valid `piece` query-parameter values accepted by route-planner
 * challenge/training pages.
 */
export const VALID_PIECE_NAMES = ['bishop', 'knight'] as const;

export type ValidPieceName = (typeof VALID_PIECE_NAMES)[number];
