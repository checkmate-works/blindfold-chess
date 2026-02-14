export type RoutePlannerPieceType = "N" | "B" | "R" | "Q";

export const ROUTE_PLANNER_PIECES: RoutePlannerPieceType[] = [
  "N",
  "B",
  "R",
  "Q",
];

export type RoutePlannerProblem = {
  piece: RoutePlannerPieceType;
  start: string;
  end: string;
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
  start: string;
  end: string;
  success: boolean;
  userPath: string[];
  shortestPath: string[];
  skipped?: boolean;
};

export type RoutePlannerResult = {
  problems: RoutePlannerProblemResult[];
  totalProblems: number;
  correctCount: number;
  accuracy: number;
};
