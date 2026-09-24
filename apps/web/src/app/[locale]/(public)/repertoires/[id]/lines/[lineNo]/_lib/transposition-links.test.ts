import { replayMoves } from '@blindfold-chess/features/chess-core';
import { describe, expect, it } from 'vitest';

import type { LineForTransposition } from '@/lib/repertoires/line-transpositions';

import { buildTranspositionLinks } from './transposition-links';

function line(id: string, moves: string[]): LineForTransposition {
  return { id, positions: replayMoves(moves).map((p) => ({ fen: p.fen })) };
}

const resolve = (lineId: string) =>
  ({
    A: { lineNo: 3, label: 'Line A' },
    B: { lineNo: 5, label: 'Line B' },
  })[lineId]!;

describe('buildTranspositionLinks', () => {
  it('resolves a mid-line transposition into a span with the other line’s start ply', () => {
    // Same position after 1.Nf3 d5 2.g3 c5 3.Bg2 e6 (current, ply 6) and after
    // 1.Nf3 d5 2.g3 e6 3.Bg2 c5 (other, ply 6); both then play 4.b3 and
    // diverge, so the shared span is plies 6–7 on both sides.
    const current = line('current', ['Nf3', 'd5', 'g3', 'c5', 'Bg2', 'e6', 'b3', 'Nc6']);
    const other = line('A', ['Nf3', 'd5', 'g3', 'e6', 'Bg2', 'c5', 'b3', 'Nf6']);

    const { sharedSegments, continuations } = buildTranspositionLinks(current, [other], resolve);

    expect(sharedSegments).toEqual([
      { fromPly: 6, toPly: 7, lineNo: 3, label: 'Line A', otherFromPly: 6 },
    ]);
    expect(continuations).toEqual([]);
  });

  it('reports a transposition that runs to the final ply as both a span and a continuation', () => {
    // 1.Nf3 Nf6 2.g3 vs 1.g3 Nf6 2.Nf3 — same position at ply 3 by a different
    // move order; both play 2...d5, and only the other line keeps going.
    const current = line('current', ['Nf3', 'Nf6', 'g3', 'd5']);
    const other = line('B', ['g3', 'Nf6', 'Nf3', 'd5', 'Bg2']);

    const { sharedSegments, continuations } = buildTranspositionLinks(current, [other], resolve);

    expect(sharedSegments).toEqual([
      { fromPly: 3, toPly: 4, lineNo: 5, label: 'Line B', otherFromPly: 3 },
    ]);
    expect(continuations).toEqual([{ lineNo: 5, label: 'Line B', ply: 4, remainingPlies: 1 }]);
  });

  it('keeps a straight-prefix continuation without reporting it as a shared segment', () => {
    const current = line('current', ['e4', 'e5']);
    const other = line('A', ['e4', 'e5', 'Nf3']);

    const { sharedSegments, continuations } = buildTranspositionLinks(current, [other], resolve);

    expect(sharedSegments).toEqual([]);
    expect(continuations).toEqual([{ lineNo: 3, label: 'Line A', ply: 2, remainingPlies: 1 }]);
  });
});
