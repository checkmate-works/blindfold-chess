'use client';

import { useCallback, useMemo } from 'react';

import { getLastMoveDetails, isCheckmateFen } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, FinalGameOutcome, Side } from '@blindfold-chess/types';

import type { MoveJudgment } from '@/lib/games/analysis/types';
import type { EvaluationMark } from '@/lib/games/evaluation';
import type { TerminationMark } from '@/lib/games/termination-mark';
import {
  isFinalPosition,
  resolveLosingColor,
  resolveTerminationMark,
} from '@/lib/games/termination-mark';

import { computeCurrentPly } from '../_lib/replay-derivations';

type Options = {
  notationMoves: AlgebraicNotation[];
  startingFen: string | undefined;
  playerColor: Side;
  /** How the game ended, from `playerColor`'s point of view. */
  result: FinalGameOutcome;
  /** FEN of the game's final position — the only place the end reason is legible. */
  latestFen: string;
  /**
   * Move grades keyed by ply, from the game's AI review (its selected moments
   * — so most plies are absent, and an ungraded game passes an empty map).
   */
  judgmentByPly: ReadonlyMap<number, MoveJudgment>;
};

/** Derived, not restated: `Square` is narrower than `string`. */
type LastMove = ReturnType<typeof getLastMoveDetails>;

export type UseReviewPositionMarksReturn = {
  /**
   * The move that produced a given navigation position, for the board's
   * last-move highlight. Null on the initial board (-2) and before any move.
   */
  lastMoveAt: (position: number) => LastMove;
  /** The end-of-game badge for a given navigation position; null off the final one. */
  terminationMarkAt: (position: number) => TerminationMark | null;
  /**
   * The AI review's grade for the move that produced a given position, pinned
   * to the square it landed on. Null wherever the review said nothing — which
   * is most plies, since a review only selects its critical moments.
   */
  evaluationMarkAt: (position: number) => EvaluationMark | null;
};

/**
 * The board marks a finished-game review resolves PER NAVIGATION POSITION
 * rather than once: the last-move highlight, the end-of-game badge, and the
 * AI review's grade for the move just played.
 *
 * Both are position-parameterised for the same reason — the review shows two
 * boards at once. The "By Move" quick-peek modal scrubs independently of the
 * live board (see `useQuickPeekModal`), so a single value computed for the live
 * position would highlight the wrong move inside the modal, and would leave the
 * modal's final position unbadged whenever the board behind it sits mid-history
 * (the usual case when the strip opens it).
 *
 * The badge is confined to the final position because stepping back through the
 * replay puts the viewer inside a game that had not ended yet. Its *kind* is
 * read off the position itself (`isCheckmateFen`), which is the only place a
 * resignation is distinguishable from a mate: the record stores just
 * win/loss/draw. See `resolveTerminationMark`.
 */
export function useReviewPositionMarks({
  notationMoves,
  startingFen,
  playerColor,
  result,
  latestFen,
  judgmentByPly,
}: Options): UseReviewPositionMarksReturn {
  const lastMoveAt = useCallback(
    (position: number) => {
      if (position === -2) return null;
      const upto = position === -1 ? notationMoves : notationMoves.slice(0, position + 1);
      if (upto.length === 0) return null;
      return getLastMoveDetails(upto as string[], startingFen);
    },
    [notationMoves, startingFen]
  );

  const terminationMarkAt = useCallback(
    (position: number) =>
      isFinalPosition(position, notationMoves.length)
        ? resolveTerminationMark({
            fen: latestFen,
            losingColor: resolveLosingColor(result, playerColor),
            isCheckmate: isCheckmateFen(latestFen),
          })
        : null,
    [notationMoves.length, latestFen, result, playerColor]
  );

  const evaluationMarkAt = useCallback(
    (position: number) => {
      const ply = computeCurrentPly(position, notationMoves.length);
      if (ply == null) return null;
      const judgment = judgmentByPly.get(ply);
      if (judgment === undefined) return null;
      // The graded move IS the last move at this position, so its destination
      // square is where the badge belongs — the same square the highlight uses.
      const lastMove = lastMoveAt(position);
      return lastMove ? { square: lastMove.to, judgment } : null;
    },
    [judgmentByPly, lastMoveAt, notationMoves.length]
  );

  return useMemo(
    () => ({ lastMoveAt, terminationMarkAt, evaluationMarkAt }),
    [lastMoveAt, terminationMarkAt, evaluationMarkAt]
  );
}
