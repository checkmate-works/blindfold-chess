import { describe, expect, it } from 'vitest';

import type { Position } from '@/lib/db/schema';

import { NEXT_PUZZLE_COUNT, mergeNextPuzzleCandidates } from './next-puzzles';

function position(id: string): Position {
  return { id } as Position;
}

const ids = (rows: Position[]) => rows.map((r) => r.id);

describe('mergeNextPuzzleCandidates', () => {
  it('ranks the author tier ahead of the newest tier', () => {
    const byAuthor = [position('a1'), position('a2')];
    const newest = [position('n1'), position('n2'), position('n3')];

    expect(ids(mergeNextPuzzleCandidates('current', [byAuthor, newest]))).toEqual([
      'a1',
      'a2',
      'n1',
      'n2',
    ]);
  });

  it('drops the puzzle that was just solved from every tier', () => {
    const byAuthor = [position('current'), position('a1')];
    const newest = [position('n1'), position('current'), position('n2')];

    expect(ids(mergeNextPuzzleCandidates('current', [byAuthor, newest]))).toEqual([
      'a1',
      'n1',
      'n2',
    ]);
  });

  it('collapses a puzzle that appears in both tiers onto its first occurrence', () => {
    const byAuthor = [position('a1')];
    const newest = [position('a1'), position('n1')];

    expect(ids(mergeNextPuzzleCandidates('current', [byAuthor, newest]))).toEqual(['a1', 'n1']);
  });

  it('caps the result at NEXT_PUZZLE_COUNT', () => {
    const newest = Array.from({ length: NEXT_PUZZLE_COUNT + 3 }, (_, i) => position(`n${i}`));

    expect(mergeNextPuzzleCandidates('current', [[], newest])).toHaveLength(NEXT_PUZZLE_COUNT);
  });

  it('returns fewer cards rather than padding when the catalog is small', () => {
    expect(ids(mergeNextPuzzleCandidates('current', [[], [position('current')]]))).toEqual([]);
    expect(ids(mergeNextPuzzleCandidates('current', [[position('a1')], []]))).toEqual(['a1']);
  });
});
