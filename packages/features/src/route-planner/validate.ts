import { isValidSquare } from "../common";

import { getPossibleMoves } from "./moves";
import type { RoutePlannerPieceType } from "./types";

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
