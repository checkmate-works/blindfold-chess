import { getMovesForPiece } from "../../common";
import type { RoutePlannerPieceType } from "../types";

import type { RoutePlannerStrategy, RouteStrategyMap } from "./types";

/**
 * Per-piece difficulty bounds for generated route problems.
 *
 * `pathLength` includes the start square, so `pathLength === 3` means 2 moves
 * (start -> intermediate -> end). 1-move paths are rejected as trivial.
 *
 * - knight: 2-3 moves. A 1-move jump is trivial; capped at 3 moves to keep
 *   problems tractable for mental visualization.
 * - bishop: exactly 2 moves. A 1-move path means start/end share a diagonal
 *   (too easy); any two same-color squares not on a diagonal are reachable in
 *   exactly 2 bishop moves.
 * - rook / queen: 2+ moves. Both reach most squares in 1 move, so we require
 *   at least one intermediate square to make the problem non-trivial.
 */
const PIECE_PATH_BOUNDS: Record<
  RoutePlannerPieceType,
  { min: number; max: number }
> = {
  n: { min: 3, max: 4 },
  b: { min: 3, max: 3 },
  r: { min: 3, max: Infinity },
  q: { min: 3, max: Infinity },
};

function createStrategy(piece: RoutePlannerPieceType): RoutePlannerStrategy {
  const { min, max } = PIECE_PATH_BOUNDS[piece];
  return {
    getMoves(f, r) {
      return getMovesForPiece(piece, f, r);
    },
    meetsConstraint(pathLength) {
      return pathLength >= min && pathLength <= max;
    },
  };
}

export const RouteStrategies: RouteStrategyMap = {
  n: createStrategy("n"),
  b: createStrategy("b"),
  r: createStrategy("r"),
  q: createStrategy("q"),
};
