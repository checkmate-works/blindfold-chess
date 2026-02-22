export {
  ROUTE_PLANNER_PIECES,
  DEFAULT_ROUTE_PLANNER_SETTINGS,
} from "@blindfold-chess/features/route-planner";

export type {
  RoutePlannerPieceType,
  RoutePlannerProblem,
  RoutePlannerSettings,
  RoutePlannerProblemResult,
  RoutePlannerResult,
} from "@blindfold-chess/features/route-planner";

export const PIECE_DISPLAY_MAP: Record<string, string> = {
  n: "\u2658",
  b: "\u2657",
  r: "\u2656",
  q: "\u2655",
};
