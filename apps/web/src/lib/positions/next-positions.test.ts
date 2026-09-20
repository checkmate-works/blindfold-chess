import { describe, expect, it } from 'vitest';

import type { Position } from '@/lib/db/schema';

import { NEXT_POSITION_COUNT, mergeNextPositionCandidates } from './next-positions';

function position(id: string): Position {
  return { id } as Position;
}

const ids = (rows: Position[]) => rows.map((r) => r.id);

describe('mergeNextPositionCandidates', () => {
  it('ranks the author tier ahead of the newest tier', () => {
    const byAuthor = [position('a1'), position('a2')];
    const newest = [position('n1'), position('n2'), position('n3')];

    expect(ids(mergeNextPositionCandidates('current', [byAuthor, newest]))).toEqual([
      'a1',
      'a2',
      'n1',
      'n2',
    ]);
  });

  it('drops the puzzle that was just solved from every tier', () => {
    const byAuthor = [position('current'), position('a1')];
    const newest = [position('n1'), position('current'), position('n2')];

    expect(ids(mergeNextPositionCandidates('current', [byAuthor, newest]))).toEqual([
      'a1',
      'n1',
      'n2',
    ]);
  });

  it('collapses a puzzle that appears in both tiers onto its first occurrence', () => {
    const byAuthor = [position('a1')];
    const newest = [position('a1'), position('n1')];

    expect(ids(mergeNextPositionCandidates('current', [byAuthor, newest]))).toEqual(['a1', 'n1']);
  });

  it('caps the result at NEXT_POSITION_COUNT', () => {
    const newest = Array.from({ length: NEXT_POSITION_COUNT + 3 }, (_, i) => position(`n${i}`));

    expect(mergeNextPositionCandidates('current', [[], newest])).toHaveLength(NEXT_POSITION_COUNT);
  });

  it('returns fewer cards rather than padding when the catalog is small', () => {
    expect(ids(mergeNextPositionCandidates('current', [[], [position('current')]]))).toEqual([]);
    expect(ids(mergeNextPositionCandidates('current', [[position('a1')], []]))).toEqual(['a1']);
  });

  it('excludes nothing when there is no current position', () => {
    // A run with no catalog position behind it (the token-based custom-FEN
    // result): every candidate is one the reader has not just been looking at.
    const newest = [position('n1'), position('n2')];

    expect(ids(mergeNextPositionCandidates(null, [newest]))).toEqual(['n1', 'n2']);
  });
});
