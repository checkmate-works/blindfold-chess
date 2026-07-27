import { replayMoves } from '@blindfold-chess/features/chess-core';
import { describe, expect, it } from 'vitest';

import type { LineForTransposition } from './line-transpositions';
import { findLineTranspositions } from './line-transpositions';

function line(
  id: string,
  seq: number,
  moves: string[],
  startingFen?: string
): LineForTransposition {
  return {
    id,
    seq,
    positions: replayMoves(moves, startingFen).map((p) => ({ fen: p.fen })),
  };
}

// Real transposing pair from a local repertoire (verified 2026-07-27): both
// reach "1.Nf3 d5 2.g3 c5 3.Bg2 e6 4.b3" — L3 by that move order, L5 via
// 2...e6 3.Bg2 c5 first — and L5 keeps going another 8 plies from there.
const L3_MOVES = ['Nf3', 'd5', 'g3', 'c5', 'Bg2', 'e6', 'b3'];
const L5_MOVES = [
  'Nf3',
  'd5',
  'g3',
  'e6',
  'Bg2',
  'c5',
  'b3',
  'Nc6',
  'Bb2',
  'Nf6',
  'e3',
  'Be7',
  'Qe2',
  'O-O',
  'O-O',
];

describe('findLineTranspositions', () => {
  it('reports nothing for a common opening prefix alone', () => {
    const current = line('current', 0, ['Nf3', 'e5']);
    const other = line('other', 1, ['Nf3', 'd5', 'g3', 'e6']);

    const result = findLineTranspositions(current, [other]);

    expect(result.segments).toEqual([]);
    expect(result.continuations).toEqual([]);
  });

  it('finds a segment where two lines diverge then reconverge, with the tail as a continuation', () => {
    const current = line('L3', 2, L3_MOVES);
    const other = line('L5', 4, L5_MOVES);

    const result = findLineTranspositions(current, [other]);

    expect(result.segments).toEqual([
      { otherLineId: 'L5', fromPly: 6, toPly: 7, otherFromPly: 6, otherContinuationPlies: 8 },
    ]);
    expect(result.continuations).toEqual(result.segments);
  });

  it('treats a full-prefix line as a continuation even though it is suppressed from segments', () => {
    const current = line('current', 0, L5_MOVES.slice(0, 3)); // 1. Nf3 d5 2. g3
    const other = line('L5', 4, L5_MOVES);

    const result = findLineTranspositions(current, [other]);

    expect(result.segments).toEqual([]);
    expect(result.continuations).toEqual([
      { otherLineId: 'L5', fromPly: 1, toPly: 3, otherFromPly: 1, otherContinuationPlies: 12 },
    ]);
  });

  it('finds a segment with no continuation when the other line ends at the shared position', () => {
    // current (L5) is the longer line; other (L3) ends exactly where they meet.
    const current = line('L5', 4, L5_MOVES);
    const other = line('L3', 2, L3_MOVES);

    const result = findLineTranspositions(current, [other]);

    expect(result.segments).toEqual([
      { otherLineId: 'L3', fromPly: 6, toPly: 7, otherFromPly: 6, otherContinuationPlies: 0 },
    ]);
    expect(result.continuations).toEqual([]);
  });

  it('matches positions at different ply numbers (no same-ply assumption)', () => {
    // current shuffles a knight out and back (Nf3 Nf6 Ng1 Ng8 Nf3): ply 4 is
    // the start position again, ply 5 is `other`'s ply 1 (just 1. Nf3) — a
    // two-ply run matched at other-side offset 0..1, not current-side 4..5.
    const current = line('current', 0, ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3']);
    const other = line('other', 1, ['Nf3']);

    const result = findLineTranspositions(current, [other]);

    expect(result.segments).toContainEqual({
      otherLineId: 'other',
      fromPly: 4,
      toPly: 5,
      otherFromPly: 0,
      otherContinuationPlies: 0,
    });
  });

  it('does not self-match a line that repeats one of its own positions', () => {
    const current = line('current', 0, ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3']);

    const result = findLineTranspositions(current, []);

    expect(result.segments).toEqual([]);
    expect(result.continuations).toEqual([]);
  });

  it('does not crash on a line whose PGN failed to parse (root position only)', () => {
    const current = line('current', 0, L3_MOVES);
    const unparseable: LineForTransposition = {
      id: 'broken',
      seq: 1,
      positions: replayMoves([]).map((p) => ({ fen: p.fen })),
    };

    const result = findLineTranspositions(current, [unparseable]);

    expect(result.segments).toEqual([]);
    expect(result.continuations).toEqual([]);
  });

  it('matches by position key across lines with different starting_fen', () => {
    const rootMoves = ['e4', 'e5', 'Nf3'];
    const customRootFen = replayMoves(rootMoves).at(-1)!.fen;

    const current = line('current', 0, rootMoves);
    const other = line('other', 1, ['Nc6', 'Bb5'], customRootFen);

    const result = findLineTranspositions(current, [other]);

    expect(result.continuations).toEqual([
      { otherLineId: 'other', fromPly: 3, toPly: 3, otherFromPly: 0, otherContinuationPlies: 2 },
    ]);
    expect(result.segments).toEqual(result.continuations);
  });

  it('reports one independent segment per other line when three or more lines share a position', () => {
    // A second reconvergence, independent of L5's: b3/Bg2 swap order instead
    // of c5/e6, meeting L3 only at the final position, plus one extra ply.
    const e = [...L3_MOVES.slice(0, 4), 'b3', 'e6', 'Bg2', 'a6'];
    const current = line('L3', 2, L3_MOVES);
    const l5 = line('L5', 4, L5_MOVES);
    const lineE = line('E', 5, e);

    const result = findLineTranspositions(current, [l5, lineE]);

    expect(result.continuations).toHaveLength(2);
    expect(result.continuations.map((s) => s.otherLineId).sort()).toEqual(['E', 'L5']);
  });
});
