import type { PieceType, Square } from "@blindfold-chess/types";

/**
 * Piece types available in the route planner training exercise.
 *
 * In route planner, the user is given a piece, a start square, and a target
 * square, then must find a valid path (sequence of intermediate squares) for
 * the piece to reach the target.
 */
// TODO: Consider limiting to knight and bishop only (rook/queen removed from web app as too easy)
export type RoutePlannerPieceType = Extract<PieceType, "n" | "b" | "r" | "q">;

export const ROUTE_PLANNER_PIECES: readonly RoutePlannerPieceType[] = [
  "n",
  "b",
  "r",
  "q",
];

/** A generated route planner problem: the user must find a path from `start` to `end` for `piece`. */
export type RoutePlannerProblem = {
  piece: RoutePlannerPieceType;
  start: Square;
  end: Square;
};

export type RoutePlannerSettings = {
  problemCount: number;
  selectedPieces: RoutePlannerPieceType[];
};

export const DEFAULT_ROUTE_PLANNER_SETTINGS: RoutePlannerSettings = {
  problemCount: 5,
  selectedPieces: [...ROUTE_PLANNER_PIECES],
};

export type RoutePlannerProblemResult = {
  piece: RoutePlannerPieceType;
  start: Square;
  end: Square;
  success: boolean;
  userPath: Square[];
  shortestPath: Square[];
  skipped?: boolean;
};

export type RoutePlannerResult = {
  problems: RoutePlannerProblemResult[];
  totalProblems: number;
  correctCount: number;
  accuracy: number;
};
