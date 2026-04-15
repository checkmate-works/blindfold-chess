import { KNIGHT_OFFSETS } from "../../common";

import { getValidMove } from "./helpers";
import type { RoutePlannerStrategy } from "./types";

/**
 * Knight: requires 2-3 moves (pathLength 3-4).
 * A 1-move knight jump is trivial, so we require at least 2 moves.
 * We cap at 3 moves to keep problems tractable for mental visualization.
 */
export const KnightRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    return KNIGHT_OFFSETS.flatMap((d) => getValidMove(f + d[0], r + d[1]));
  },
  meetsConstraint(pathLength) {
    return pathLength >= 3 && pathLength <= 4;
  },
};
