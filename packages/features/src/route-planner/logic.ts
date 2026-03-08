import type { Square } from "@blindfold-chess/types";

import {
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

interface RoutePlannerStrategy {
  getMoves(file: number, rank: number): string[];
  meetsConstraint(pathLength: number): boolean;
}

const getValidMove = (f: number, r: number): string[] => {
  const sq = coordsToSquare(f, r);
  return sq ? [sq] : [];
};

const getValidLines = (f: number, r: number, dirs: number[][]): string[] => {
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

const KnightRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    const jumps = [
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
    ];
    return jumps.flatMap((d) => getValidMove(f + d[0], r + d[1]));
  },
  meetsConstraint(pathLength) {
    return pathLength >= 3 && pathLength <= 4;
  },
};

const BishopRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    const dirs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    return getValidLines(f, r, dirs);
  },
  meetsConstraint(pathLength) {
    return pathLength === 3;
  },
};

const RookRouteStrategy: RoutePlannerStrategy = {
  getMoves(f, r) {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    return getValidLines(f, r, dirs);
  },
  meetsConstraint(pathLength) {
    return pathLength >= 3;
  },
};

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
 * Validates a user-provided path sequence starting from a given square.
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
 * Generate a route-planner problem with per-piece difficulty constraints.
 *
 * Path length includes the start square, so:
 *   path.length === 2 means 1 move (start -> end)
 *   path.length === 3 means 2 moves (start -> mid -> end)
 *   path.length === 4 means 3 moves (start -> mid1 -> mid2 -> end)
 *
 * Per-piece constraints:
 * - Rook (R):   min 2 moves, path.length >= 3 (must pass through at least one intermediate square)
 * - Queen (Q):  min 2 moves, path.length >= 3 (must pass through at least one intermediate square)
 * - Bishop (B): exactly 2 moves, path.length === 3 (same-color squares only)
 * - Knight (N): 2-3 moves, path.length >= 3 AND path.length <= 4
 */
export function generateProblem(
  allowedPieces: RoutePlannerPieceType[] = ROUTE_PLANNER_PIECES,
): RoutePlannerProblem {
  const pool = allowedPieces.length > 0 ? allowedPieces : ROUTE_PLANNER_PIECES;

  let piece: RoutePlannerPieceType;
  let start: string;
  let end: string;
  let path: string[] | null;

  do {
    piece = pool[Math.floor(Math.random() * pool.length)];
    start = generateRandomSquare();
    end = generateRandomSquare();

    // Ensure start !== end
    while (start === end) {
      end = generateRandomSquare();
    }

    // Bishop: start and end must be on the same color
    if (piece === "b") {
      while (!isSameColor(start, end) || start === end) {
        end = generateRandomSquare();
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
