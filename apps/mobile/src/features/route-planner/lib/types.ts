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

import { PIECE_DISPLAY_MAP as SHARED_PIECE_DISPLAY_MAP } from "@blindfold-chess/features/common";

export const PIECE_DISPLAY_MAP: Record<string, string> =
  SHARED_PIECE_DISPLAY_MAP;
