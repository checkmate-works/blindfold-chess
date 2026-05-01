import { getMovesForPiece } from "../../common";

import type { RoutePlannerStrategy } from "./types";

/**
 * Queen: requires 2+ moves (pathLength >= 3).
 * A queen can reach most squares in 1 move, so we require at least one
 * intermediate square to make the problem non-trivial.
 */
export const QueenRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    return getMovesForPiece("q", f, r);
  },
  meetsConstraint(pathLength) {
    return pathLength >= 3;
  },
};
