import type { Square } from "@blindfold-chess/types";

import { findShortestPath } from "./bfs";
import type { RoutePlannerPieceType } from "./types";
import { validateUserPath } from "./validate";

/**
 * Normalize the user's entered squares into the path that gets scored: the
 * goal square is appended when the user did not enter it as their last move
 * (including the empty-input case, which becomes a direct start→end attempt).
 */
export function buildFinalPath(
  moves: readonly Square[],
  end: Square,
): Square[] {
  if (moves.length === 0 || moves[moves.length - 1] !== end) {
    return [...moves, end];
  }
  return [...moves];
}

/** The shortest reference path for a problem, or [] when unreachable. */
export function getShortestPathOrEmpty(
  piece: RoutePlannerPieceType,
  start: Square,
  end: Square,
): Square[] {
  return findShortestPath(piece, start, end) ?? [];
}

export type RoutePlannerAttempt = {
  /** The scored path — the user's moves with the goal square appended. */
  finalMoves: Square[];
  success: boolean;
  /** The shortest reference path shown on the result card. */
  shortestPath: Square[];
  message: "correct" | "incorrect";
};

/**
 * Score one route-planner attempt: normalize the entered path
 * ({@link buildFinalPath}), validate it move-by-move, and compute the
 * shortest reference path for the result display.
 */
export function evaluateAttempt(
  piece: RoutePlannerPieceType,
  start: Square,
  moves: readonly Square[],
  end: Square,
): RoutePlannerAttempt {
  const finalMoves = buildFinalPath(moves, end);
  const validation = validateUserPath(piece, start, finalMoves, end);
  return {
    finalMoves,
    success: validation.valid,
    shortestPath: getShortestPathOrEmpty(piece, start, end),
    message: validation.valid ? "correct" : "incorrect",
  };
}
