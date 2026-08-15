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
  it('draws the arrow on the same board as the grade it explains', () => {
    const { bestMoveArrowAt } = marks();

    // The graded move's own board — where its `?!` badge sits too. g1 has just
    // been vacated by the move being second-guessed; the last-move highlight
    // on g1/d2 is what tells the two apart.
    expect(bestMoveArrowAt(GRADED_PLY)).toEqual({
      arrows: [{ from: 'g1', to: 'f3', color: 'blue' }],
      circles: [],
    });
    expect(bestMoveArrowAt(GRADED_PLY - 1)).toBeNull();
  });

  it('has nothing to draw on a step the review did not grade', () => {
    const { bestMoveArrowAt } = marks();
    expect(bestMoveArrowAt(0)).toBeNull();
    expect(bestMoveArrowAt(-2)).toBeNull();
  });

  it('resolves the SAN against the board it was legal on, not the one shown', () => {
    // `Nf3` is ambiguous on the displayed board (both knights reach f3 after
    // 2.Nd2) and illegal from g1 there — it only parses one move earlier.
    const { bestMoveArrowAt } = marks({ bestMoves: new Map([[0, 'e4']]) });
    expect(bestMoveArrowAt(0)).toEqual({
      arrows: [{ from: 'e2', to: 'e4', color: 'blue' }],
      circles: [],
    });
  });

  it('drops a best move that is not legal in its position rather than drawing it wrong', () => {
    const { bestMoveArrowAt } = marks({
      bestMoves: new Map([[GRADED_PLY, 'Qxh8']]),
    });
    expect(bestMoveArrowAt(GRADED_PLY)).toBeNull();
  });
});
