import type { Square } from "@blindfold-chess/types";

import { type RandomSource, generateRandomSquare } from "../common";

import { RouteStrategies } from "./_strategies";
import { findShortestPath } from "./bfs";
import { isSameColor } from "./coords";
import type { RoutePlannerPieceType, RoutePlannerProblem } from "./types";
import { ROUTE_PLANNER_PIECES } from "./types";

/**
 * Generate a route planner problem with per-piece difficulty constraints.
 *
 * Randomly selects a piece, start square, and end square, then verifies that
 * the shortest path meets the piece's minimum difficulty constraint. This
 * ensures trivially simple 1-move problems are never generated.
 *
 * Path length includes the start square, so:
 * - `pathLength === 2` means 1 move (start -> end)
 * - `pathLength === 3` means 2 moves (start -> mid -> end)
 * - `pathLength === 4` means 3 moves (start -> mid1 -> mid2 -> end)
 *
 * Per-piece constraints (all require pathLength >= 3, i.e., at least 2 moves):
 * - Knight: 2-3 moves (`3 <= pathLength <= 4`) -- capped to keep problems tractable
 * - Bishop: exactly 2 moves (`pathLength === 3`) -- start/end must be same color, different diagonal
 * - Rook:   2+ moves (`pathLength >= 3`) -- start/end must not share rank or file
 * - Queen:  2+ moves (`pathLength >= 3`) -- start/end must not be directly reachable
 *
 * @param allowedPieces Subset of piece types to choose from (defaults to all)
 * @param rng Random number source for deterministic testing
 */
export function generateProblem(
  allowedPieces: RoutePlannerPieceType[] = ROUTE_PLANNER_PIECES,
  rng: RandomSource = Math.random,
): RoutePlannerProblem {
  const pool = allowedPieces.length > 0 ? allowedPieces : ROUTE_PLANNER_PIECES;

  let piece: RoutePlannerPieceType;
  let start: string;
  let end: string;
  let path: string[] | null;

  do {
    piece = pool[Math.floor(rng() * pool.length)];
    start = generateRandomSquare(rng);
    end = generateRandomSquare(rng);

    // Ensure start !== end
    while (start === end) {
      end = generateRandomSquare(rng);
    }

    // Bishop: start and end must be on the same color
    if (piece === "b") {
      while (!isSameColor(start, end) || start === end) {
        end = generateRandomSquare(rng);
      }
    }

    path = findShortestPath(piece, start, end);
  } while (!path || !meetsPathConstraint(piece, path));

  return { piece, start: start as Square, end: end as Square };
}

/**
 * Check whether a path meets the per-piece difficulty constraint.
 */
function meetsPathConstraint(
  piece: RoutePlannerPieceType,
  path: string[],
): boolean {
  const strategy = RouteStrategies[piece];
  return strategy ? strategy.meetsConstraint(path.length) : false;
}
