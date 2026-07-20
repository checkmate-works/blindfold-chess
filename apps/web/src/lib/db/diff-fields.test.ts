import { describe, expect, it } from 'vitest';

import { diffSolutionMoves } from './diff-fields';
import type { PuzzleSolutionMove } from './schema/positions';

function move(san: string, note: string | null = null): PuzzleSolutionMove {
  return { san, note };
}

describe('diffSolutionMoves', () => {
  it('returns null when the solution rows are unchanged', () => {
    const rows = [[move('Nf3'), move('Nc6')]];
    expect(diffSolutionMoves(rows, rows)).toBeNull();
  });

  it('returns null when only row order changed (rows are an unordered set)', () => {
    const prev = [[move('Nf3')], [move('Bg5')]];
    const next = [[move('Bg5')], [move('Nf3')]];
    expect(diffSolutionMoves(prev, next)).toBeNull();
  });

  it('detects a changed move', () => {
    const prev = [[move('Nf3')]];
    const next = [[move('Bg5')]];
    expect(diffSolutionMoves(prev, next)).toEqual({ from: prev, to: next });
  });

  it('detects a changed note with the same move', () => {
    const prev = [[move('Nf3', 'develops')]];
    const next = [[move('Nf3', 'controls e5')]];
    expect(diffSolutionMoves(prev, next)).toEqual({ from: prev, to: next });
  });

  it('detects an added alternative solution row', () => {
    const prev = [[move('Nf3')]];
    const next = [[move('Nf3')], [move('Bg5')]];
    expect(diffSolutionMoves(prev, next)).toEqual({ from: prev, to: next });
  });
});
