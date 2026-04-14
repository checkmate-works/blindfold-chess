import type { Square } from "@blindfold-chess/types";

import {
  type RandomSource,
  BISHOP_DIRS,
  KNIGHT_OFFSETS,
  ROOK_DIRS,
  isValidSquare,
  squareToFileIndex,
  squareToRankIndex,
  fileRankToSquare,
  generateRandomSquare,
} from "../common";

import type { RoutePlannerPieceType, RoutePlannerProblem } from "./types";
import { ROUTE_PLANNER_PIECES } from "./types";

export function squareToCoords(square: string): [number, number] {
  return [squareToFileIndex(square), squareToRankIndex(square)];
}

export function coordsToSquare(file: number, rank: number): string {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return "";
  return fileRankToSquare(file, rank);
}

export { isValidSquare as isValidRoutePlannerSquare };

/**
 * Strategy interface for piece-specific move generation and difficulty constraints.
 *
 * Each piece type has a `meetsConstraint` predicate that rejects trivially simple
 * problems (e.g., 1-move direct routes). The `pathLength` parameter includes the
 * start square, so `pathLength === 3` means 2 moves (start -> intermediate -> end).
 */
interface RoutePlannerStrategy {
  getMoves(file: number, rank: number): string[];
  meetsConstraint(pathLength: number): boolean;
}

const getValidMove = (f: number, r: number): string[] => {
  const sq = coordsToSquare(f, r);
  return sq ? [sq] : [];
};

const getValidLines = (
  f: number,
  r: number,
  dirs: readonly (readonly number[])[],
): string[] => {
  return dirs.flatMap((d) => {
    const lineMoves: string[] = [];
    for (let i = 1; i < 8; i++) {
      const nf = f + d[0] * i;
      const nr = r + d[1] * i;
      const sq = coordsToSquare(nf, nr);
      if (sq) lineMoves.push(sq);
      else break;
    }
    return lineMoves;
  });
};

/**
 * Knight: requires 2-3 moves (pathLength 3-4).
 * A 1-move knight jump is trivial, so we require at least 2 moves.
 * We cap at 3 moves to keep problems tractable for mental visualization.
 */
const KnightRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    return KNIGHT_OFFSETS.flatMap((d) => getValidMove(f + d[0], r + d[1]));
  },
  meetsConstraint(pathLength) {
    return pathLength >= 3 && pathLength <= 4;
  },
};

/**
 * Bishop: requires exactly 2 moves (pathLength === 3).
 * A 1-move bishop path means start and end share a diagonal, which is too easy.
 * Bishop problems are always exactly 2 moves since any two same-color squares
 * not on the same diagonal are reachable in exactly 2 bishop moves.
 */
const BishopRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    return getValidLines(f, r, BISHOP_DIRS);
  },
  meetsConstraint(pathLength) {
    return pathLength === 3;
  },
};

/**
 * Rook: requires 2+ moves (pathLength >= 3).
 * A 1-move rook path (same rank or file) is trivial, so we require at least
 * one intermediate square.
 */
const RookRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    return getValidLines(f, r, ROOK_DIRS);
  },
  meetsConstraint(pathLength) {
    return pathLength >= 3;
  },
};

/**
 * Queen: requires 2+ moves (pathLength >= 3).
 * A queen can reach most squares in 1 move, so we require at least one
 * intermediate square to make the problem non-trivial.
 */
const QueenRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    return [
      ...BishopRouteStrategy.getMoves(f, r),
      ...RookRouteStrategy.getMoves(f, r),
    ];
  },
  meetsConstraint(pathLength) {
    return pathLength >= 3;
  },
};

const RouteStrategies: Record<RoutePlannerPieceType, RoutePlannerStrategy> = {
  n: KnightRouteStrategy,
  b: BishopRouteStrategy,
  r: RookRouteStrategy,
  q: QueenRouteStrategy,
};

export function getPossibleMoves(
  piece: RoutePlannerPieceType,
  square: string,
): string[] {
  const [f, r] = squareToCoords(square);
  const strategy = RouteStrategies[piece];
  return strategy ? strategy.getMoves(f, r) : [];
}

/**
 * Find the shortest path for a piece from `start` to `end` using BFS.
 *
 * @returns The path as an array of squares including both `start` and `end`,
 *          or `null` if no path exists (e.g., bishop between different-color squares).
 *          The path length includes the start square, so a 1-move route has length 2.
 */
export function findShortestPath(
  piece: RoutePlannerPieceType,
  start: string,
  end: string,
): string[] | null {
  if (start === end) return [start];

  const parent = new Map<string, string>();
  const queue: string[] = [start];
  let head = 0;
  parent.set(start, "");

  while (head < queue.length) {
    const current = queue[head++];

    if (current === end) {
      // Reconstruct path from parent map
      const path: string[] = [];
      let node: string | undefined = end;
      while (node !== undefined && node !== "") {
        path.push(node);
        node = parent.get(node);
      }
      path.reverse();
      return path;
    }

    const moves = getPossibleMoves(piece, current);
    for (const move of moves) {
      if (!parent.has(move)) {
        parent.set(move, current);
        queue.push(move);
      }
    }
  }

  return null;
}

/**
 * Validate a user-provided path for a route planner problem.
 *
 * Checks that every consecutive move in the path is legal for the given piece
 * and that the path ends at the goal square. The `userPath` should not include
 * the start square (it is prepended automatically in the returned `fullPath`).
 *
 * @param piece The piece type
 * @param start The starting square (e.g. 'f6')
 * @param userPath The sequence of squares entered by user (e.g. ['e4', 'd2'])
 * @param goal The goal square (e.g. 'd2')
 */
export function validateUserPath(
  piece: RoutePlannerPieceType,
  start: string,
  userPath: string[],
  goal: string,
): { valid: boolean; error?: string; fullPath?: string[] } {
  if (userPath.length === 0) return { valid: false, error: "Empty path" };

  const lastUserSquare = userPath[userPath.length - 1];
  if (lastUserSquare !== goal) {
    return { valid: false, error: "Path does not end at goal" };
  }

  let current = start;
  const fullPath = [start];

  for (const nextSquare of userPath) {
    if (!isValidSquare(nextSquare))
      return { valid: false, error: `Invalid square: ${nextSquare}` };

    const possible = getPossibleMoves(piece, current);
    if (!possible.includes(nextSquare)) {
      return { valid: false, error: "Invalid move" };
    }
    current = nextSquare;
    fullPath.push(current);
  }

  return { valid: true, fullPath };
}

export function isSameColor(sq1: string, sq2: string): boolean {
  const [f1, r1] = squareToCoords(sq1);
  const [f2, r2] = squareToCoords(sq2);
  return (f1 + r1) % 2 === (f2 + r2) % 2;
}

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
