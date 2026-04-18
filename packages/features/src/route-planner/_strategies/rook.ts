import { ROOK_DIRS } from "../../common";

import { getValidLines } from "./helpers";
import type { RoutePlannerStrategy } from "./types";

/**
 * Rook: requires 2+ moves (pathLength >= 3).
 * A 1-move rook path (same rank or file) is trivial, so we require at least
 * one intermediate square.
 */
export const RookRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    return getValidLines(f, r, ROOK_DIRS);
  },
  meetsConstraint(pathLength) {
    return pathLength >= 3;
  },
};
