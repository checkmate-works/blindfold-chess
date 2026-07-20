import { describe, expect, it } from 'vitest';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { buildSolutionPairs } from './solution-pairs';

const move = (san: string, note: string | null = null): PuzzleSolutionMove => ({ san, note });

describe('buildSolutionPairs', () => {
  it('pairs plies into white/black rows with real fullmove numbering when White moves first', () => {
    // Previously each ply got its own incrementing label (1. Nf3, 2. d5,
    // 3. Bg5), which reads as move 2 for a black reply — not how chess
    // notation numbers moves. This must land Nf3+d5 under "1." and Bg5 under
    // "2.", matching the standard "1. Nf3 d5 2. Bg5" mental model.
    const pairs = buildSolutionPairs([move('Nf3'), move('d5'), move('Bg5')], 'w', 1);
    expect(pairs).toEqual([
      { moveNumber: 1, white: move('Nf3'), black: move('d5') },
      { moveNumber: 2, white: move('Bg5'), black: null },
    ]);
  });

  it('opens with an empty white cell when the puzzle starts with Black to move', () => {
    const pairs = buildSolutionPairs([move('Rxa1'), move('Kxa1')], 'b', 30);
    expect(pairs).toEqual([
      { moveNumber: 30, white: null, black: move('Rxa1') },
      { moveNumber: 31, white: move('Kxa1'), black: null },
    ]);
  });

  it('returns an empty array for no moves', () => {
    expect(buildSolutionPairs([], 'w', 1)).toEqual([]);
  });
});
