import type { Square } from "@blindfold-chess/types";

import {
  type RandomSource,
  ALL_SQUARES,
  generateRandomSquare,
} from "../common";

import { RouteStrategies } from "./_strategies";
import { findShortestPath } from "./bfs";
import { isSameColor } from "./coords";
import type { RoutePlannerPieceType, RoutePlannerProblem } from "./types";
import { ROUTE_PLANNER_PIECES } from "./types";

/**
 * Bound on generate-and-test attempts. Every piece's difficulty constraint is
 * satisfied by a large fraction of random square pairs (worst case roughly
 * half), so with a real RNG a handful of attempts suffice; the cap exists so
 * a stubbed or degenerate rng fails fast instead of hanging the process.
 */
const MAX_GENERATION_ATTEMPTS = 200;

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
  allowedPieces: readonly RoutePlannerPieceType[] = ROUTE_PLANNER_PIECES,
  rng: RandomSource = Math.random,
): RoutePlannerProblem {
  const pool = allowedPieces.length > 0 ? allowedPieces : ROUTE_PLANNER_PIECES;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const problem = attemptProblem(pool, rng);
    if (problem) return problem;
  }
  throw new Error(
    `Failed to generate a route planner problem in ${MAX_GENERATION_ATTEMPTS} attempts`,
  );
}

/**
 * One generate-and-test attempt. Returns null when the drawn pair fails the
 * piece's difficulty constraint (the caller re-rolls).
 */
function attemptProblem(
  pool: readonly RoutePlannerPieceType[],
  rng: RandomSource,
): RoutePlannerProblem | null {
  const piece = pool[Math.floor(rng() * pool.length)];
  const start = generateRandomSquare(rng);
  const end = generateRandomSquare(rng, endExclusions(piece, start));

  const path = findShortestPath(piece, start, end);
  if (!path || !meetsPathConstraint(piece, path)) return null;

  return { piece, start, end };
}

/**
 * Squares `end` may never land on: the start square itself, and for a bishop
 * every square of the opposite color (unreachable, so drawing one would only
 * waste an attempt).
 */
function endExclusions(
  piece: RoutePlannerPieceType,
  start: Square,
): ReadonlySet<Square> {
  if (piece !== "b") return new Set([start]);
  return new Set(
    ALL_SQUARES.filter((sq) => sq === start || !isSameColor(start, sq)),
  );
}

/**
 * Check whether a path meets the per-piece difficulty constraint.
 */
function meetsPathConstraint(
  piece: RoutePlannerPieceType,
  path: readonly Square[],
): boolean {
  const strategy = RouteStrategies[piece];
  return strategy ? strategy.meetsConstraint(path.length) : false;
}
