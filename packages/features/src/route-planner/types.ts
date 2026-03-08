import type { PieceType, Square } from "@blindfold-chess/types";

export type RoutePlannerPieceType = Extract<PieceType, "n" | "b" | "r" | "q">;

export const ROUTE_PLANNER_PIECES: RoutePlannerPieceType[] = [
  "n",
  "b",
  "r",
  "q",
];

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
