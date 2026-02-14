export {
  ROUTE_PLANNER_PIECES,
  DEFAULT_ROUTE_PLANNER_SETTINGS,
} from "@blindfold-chess/features";

export type {
  RoutePlannerPieceType,
  RoutePlannerProblem,
  RoutePlannerSettings,
  RoutePlannerProblemResult,
  RoutePlannerResult,
} from "@blindfold-chess/features";

export const PIECE_DISPLAY_MAP: Record<string, string> = {
  N: "\u2658",
  B: "\u2657",
  R: "\u2656",
  Q: "\u2655",
};
