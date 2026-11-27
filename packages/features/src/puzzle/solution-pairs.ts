import type { PieceColor } from "@blindfold-chess/types";

import type { PuzzleSolutionMove } from "./types";

export type FullmovePair<T> = {
  moveNumber: number;
  white: T | null;
  black: T | null;
};

export type SolutionPair = FullmovePair<PuzzleSolutionMove>;

/**
 * Pairs a ply-ordered list into white/black rows with real chess fullmove
 * numbering. When Black moves first, the first row has no white entry and
 * keeps the starting fullmove number (it has not yet ticked over to the next
 * one). A row's missing half is `null`.
 *
 * The one place the pairing is written: the solution replay and the attempt
 * history both number their rows through it, so the two lists on the result
 * screen cannot disagree about which move is "30...".
 */
export function pairByFullmove<T>(
  plies: readonly T[],
  firstTurn: PieceColor,
  startFullmove: number,
): FullmovePair<T>[] {
  const pairs: FullmovePair<T>[] = [];
  let idx = 0;
  let moveNumber = startFullmove;

  if (firstTurn === "b" && plies.length > 0) {
    pairs.push({ moveNumber, white: null, black: plies[0]! });
    idx = 1;
    moveNumber += 1;
  }

  while (idx < plies.length) {
    pairs.push({
      moveNumber,
      white: plies[idx]!,
      black: plies[idx + 1] ?? null,
    });
    idx += 2;
    moveNumber += 1;
  }

  return pairs;
}

/**
 * Pairs solution plies into white/black rows with real chess fullmove
 * numbering. Plain per-ply numbering (`i + 1`) would print "2." next to a
 * *black* move whenever the puzzle starts with White to move — a mismatch
 * with the standard "1. Nf3 d5" mental model that reads move numbers as
 * pairs.
 */
export function buildSolutionPairs(
  moves: PuzzleSolutionMove[],
  firstTurn: PieceColor,
  startFullmove: number,
): SolutionPair[] {
  return pairByFullmove(moves, firstTurn, startFullmove);
}
