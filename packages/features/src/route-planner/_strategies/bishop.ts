import { BISHOP_DIRS } from "../../common";

import { getValidLines } from "./helpers";
import type { RoutePlannerStrategy } from "./types";

/**
 * Bishop: requires exactly 2 moves (pathLength === 3).
 * A 1-move bishop path means start and end share a diagonal, which is too easy.
 * Bishop problems are always exactly 2 moves since any two same-color squares
 * not on the same diagonal are reachable in exactly 2 bishop moves.
 */
export const BishopRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    return getValidLines(f, r, BISHOP_DIRS);
  },
  meetsConstraint(pathLength) {
    return pathLength === 3;
  },
};
