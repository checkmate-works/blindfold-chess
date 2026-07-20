import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

export type SolutionPair = {
  moveNumber: number;
  white: PuzzleSolutionMove | null;
  black: PuzzleSolutionMove | null;
};

/**
 * Pairs solution plies into white/black rows with real chess fullmove
 * numbering, mirroring `AttemptHistoryPanel`'s `buildRows`. Plain per-ply
 * numbering (`i + 1`) would print "2." next to a *black* move whenever the
 * puzzle starts with White to move — a mismatch with the standard
 * "1. Nf3 d5" mental model that reads move numbers as pairs.
 */
export function buildSolutionPairs(
  moves: PuzzleSolutionMove[],
  firstTurn: 'w' | 'b',
  startFullmove: number
): SolutionPair[] {
  const pairs: SolutionPair[] = [];
  let idx = 0;
  let moveNumber = startFullmove;

  if (firstTurn === 'b' && moves.length > 0) {
    pairs.push({ moveNumber, white: null, black: moves[0]! });
    idx = 1;
    moveNumber += 1;
  }

  while (idx < moves.length) {
    pairs.push({ moveNumber, white: moves[idx]!, black: moves[idx + 1] ?? null });
    idx += 2;
    moveNumber += 1;
  }

  return pairs;
}
