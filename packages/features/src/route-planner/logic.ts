import { FILES, RANKS, isValidSquare } from "../common";

import type { RoutePlannerPieceType, RoutePlannerProblem } from "./types";
import { ROUTE_PLANNER_PIECES } from "./types";

export function squareToCoords(square: string): [number, number] {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = RANKS.indexOf(square[1] as (typeof RANKS)[number]);
  return [file, rank];
}

export function coordsToSquare(file: number, rank: number): string {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return "";
  return `${FILES[file]}${RANKS[rank]}`;
}

export { isValidSquare as isValidRoutePlannerSquare };

export function getPossibleMoves(
  piece: RoutePlannerPieceType,
  square: string,
): string[] {
  const [f, r] = squareToCoords(square);
  const moves: string[] = [];

  const addMove = (df: number, dr: number) => {
    const nf = f + df;
    const nr = r + dr;
    const sq = coordsToSquare(nf, nr);
    if (sq) moves.push(sq);
  };

  const addLine = (df: number, dr: number) => {
    for (let i = 1; i < 8; i++) {
      const nf = f + df * i;
      const nr = r + dr * i;
      const sq = coordsToSquare(nf, nr);
      if (sq) moves.push(sq);
      else break;
    }
  };

  if (piece === "n") {
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
    jumps.forEach((d) => addMove(d[0], d[1]));
  }

  if (piece === "b" || piece === "q") {
    const dirs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    dirs.forEach((d) => addLine(d[0], d[1]));
  }

  if (piece === "r" || piece === "q") {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    dirs.forEach((d) => addLine(d[0], d[1]));
  }

  return moves;
}

export function findShortestPath(
  piece: RoutePlannerPieceType,
  start: string,
  end: string,
): string[] | null {
  if (start === end) return [start];

  const parent = new Map<string, string>();
  const queue: string[] = [start];
  parent.set(start, "");

  while (queue.length > 0) {
    const current = queue.shift()!;

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

function getRandomSquare(): string {
  const f = Math.floor(Math.random() * 8);
  const r = Math.floor(Math.random() * 8);
  return coordsToSquare(f, r);
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
    start = getRandomSquare();
    end = getRandomSquare();

    // Ensure start !== end
    while (start === end) {
      end = getRandomSquare();
    }

    // Bishop: start and end must be on the same color
    if (piece === "b") {
      while (!isSameColor(start, end) || start === end) {
        end = getRandomSquare();
      }
    }

    path = findShortestPath(piece, start, end);
  } while (!path || !meetsPathConstraint(piece, path));

  return { piece, start, end };
}

/**
 * Check whether a path meets the per-piece difficulty constraint.
 */
function meetsPathConstraint(
  piece: RoutePlannerPieceType,
  path: string[],
): boolean {
  switch (piece) {
    // Rook/Queen: at least 2 moves (must pass through at least one intermediate square)
    case "r":
    case "q":
      return path.length >= 3;
    // Bishop: exactly 2 moves (path.length === 3)
    case "b":
      return path.length === 3;
    // Knight: 2-3 moves (path.length 3 or 4)
    case "n":
      return path.length >= 3 && path.length <= 4;
  }
}
