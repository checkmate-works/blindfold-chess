import type { RoutePlannerPieceType } from '@blindfold-chess/features/route-planner';

/** Pieces available for route-planner practice (knight and bishop only). */
export const PIECES: RoutePlannerPieceType[] = ['n', 'b'];

/** Single-select piece option: knight or bishop. */
export type RoutePlannerPieceSelection = RoutePlannerPieceType;

// Re-export the canonical type under the shorter alias used by this feature.
export type { RoutePlannerPieceType as PieceType };
