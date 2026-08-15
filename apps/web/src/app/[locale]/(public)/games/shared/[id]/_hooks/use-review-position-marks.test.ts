import type { AlgebraicNotation } from '@blindfold-chess/types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MoveJudgment } from '@/lib/games/analysis/types';

import { useReviewPositionMarks } from './use-review-position-marks';

// 1. d4 Nf6 2. Nd2 — the last move is the graded one, and the engine would
// have preferred the other knight square. Real chess-core throughout: the
// point of these tests is that a SAN resolves to the right two squares in the
// right position, which a stub would only restate.
const MOVES = ['d4', 'Nf6', 'Nd2'] as AlgebraicNotation[];
const GRADED_PLY = 2;

function marks({
  judgments = new Map<number, MoveJudgment>([[GRADED_PLY, 'inaccuracy']]),
  bestMoves = new Map<number, string>([[GRADED_PLY, 'Nf3']]),
}: {
  judgments?: Map<number, MoveJudgment>;
  bestMoves?: Map<number, string>;
} = {}) {
  return renderHook(() =>
    useReviewPositionMarks({
      notationMoves: MOVES,
      startingFen: undefined,
      playerColor: 'white',
      result: 'win',
      latestFen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPPNPPPP/R1BQKBNR b KQkq - 3 2',
      judgmentByPly: judgments,
      bestMoveSanByPly: bestMoves,
    })
  ).result.current;
}

describe('useReviewPositionMarks — evaluationMarkAt', () => {
  it('pins the grade to the square the graded move landed on', () => {
    expect(marks().evaluationMarkAt(GRADED_PLY)).toEqual({
      square: 'd2',
      judgment: 'inaccuracy',
    });
  });

  it('marks nothing on a position the review did not grade', () => {
    expect(marks().evaluationMarkAt(0)).toBeNull();
    expect(marks().evaluationMarkAt(-2)).toBeNull();
  });
});

describe('useReviewPositionMarks — bestMoveArrowAt', () => {
  it('draws the arrow one position BEFORE the move it explains', () => {
    const { bestMoveArrowAt } = marks();

    // The board the alternative was playable on: after 1...Nf6, before 2.Nd2.
    expect(bestMoveArrowAt(GRADED_PLY - 1)).toEqual({
      arrows: [{ from: 'g1', to: 'f3', color: 'blue' }],
      circles: [],
    });
    // Not on the graded move's own board — g1 is empty there, and the grade
    // badge is what that position gets instead.
    expect(bestMoveArrowAt(GRADED_PLY)).toBeNull();
  });

  it('has nothing to draw at the latest position or on an ungraded step', () => {
    const { bestMoveArrowAt } = marks();
    expect(bestMoveArrowAt(-1)).toBeNull();
    expect(bestMoveArrowAt(0)).toBeNull();
  });

  it('reaches the opening board when the first move is the graded one', () => {
    const { bestMoveArrowAt } = marks({
      bestMoves: new Map([[0, 'e4']]),
    });
    expect(bestMoveArrowAt(-2)).toEqual({
      arrows: [{ from: 'e2', to: 'e4', color: 'blue' }],
      circles: [],
    });
  });

  it('drops a best move that is not legal in its position rather than drawing it wrong', () => {
    const { bestMoveArrowAt } = marks({
      bestMoves: new Map([[GRADED_PLY, 'Qxh8']]),
    });
    expect(bestMoveArrowAt(GRADED_PLY - 1)).toBeNull();
  });
});
