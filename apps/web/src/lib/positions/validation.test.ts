import { describe, expect, it } from 'vitest';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import {
  PUZZLE_NOTE_MAX_LENGTH,
  normalizePuzzleMoves,
  validatePuzzleMutationData,
} from './validation';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

function buildData(overrides: Partial<Parameters<typeof validatePuzzleMutationData>[0]> = {}) {
  const defaults: Parameters<typeof validatePuzzleMutationData>[0] = {
    fen: STARTING_FEN,
    title: 'Sample puzzle',
    description: null,
    userId: USER_ID,
    solutionMoves: [
      { san: 'e4', note: null },
      { san: 'e5', note: null },
    ],
  };
  return { ...defaults, ...overrides };
}

describe('validatePuzzleMutationData', () => {
  it('returns null for a valid puzzle with per-move notes', () => {
    const err = validatePuzzleMutationData(
      buildData({
        solutionMoves: [
          { san: 'e4', note: 'kickoff' },
          { san: 'e5', note: null },
        ],
      })
    );
    expect(err).toBeNull();
  });

  it('returns "Solution is required" when solutionMoves is empty', () => {
    const err = validatePuzzleMutationData(buildData({ solutionMoves: [] }));
    expect(err).toBe('Solution is required');
  });

  it('returns an error when any note exceeds the max length', () => {
    const tooLong = 'x'.repeat(PUZZLE_NOTE_MAX_LENGTH + 1);
    const err = validatePuzzleMutationData(
      buildData({ solutionMoves: [{ san: 'e4', note: tooLong }] })
    );
    expect(err).toBe(`Each note must be ${PUZZLE_NOTE_MAX_LENGTH} characters or fewer`);
  });

  it('accepts a note exactly at the max length', () => {
    const exact = 'x'.repeat(PUZZLE_NOTE_MAX_LENGTH);
    const err = validatePuzzleMutationData(
      buildData({ solutionMoves: [{ san: 'e4', note: exact }] })
    );
    expect(err).toBeNull();
  });

  it('accepts a solution with every note set to null', () => {
    const err = validatePuzzleMutationData(
      buildData({
        solutionMoves: [
          { san: 'e4', note: null },
          { san: 'e5', note: null },
          { san: 'Nf3', note: null },
        ],
      })
    );
    expect(err).toBeNull();
  });
});

describe('normalizePuzzleMoves', () => {
  it('returns [] for [] input', () => {
    expect(normalizePuzzleMoves([])).toEqual([]);
  });

  it('collapses empty-string notes to null', () => {
    const result: PuzzleSolutionMove[] = normalizePuzzleMoves([
      { san: 'e4', note: '' },
      { san: 'e5', note: 'keep' },
    ]);
    expect(result).toEqual([
      { san: 'e4', note: null },
      { san: 'e5', note: 'keep' },
    ]);
  });

  it('collapses whitespace-only notes to null', () => {
    expect(normalizePuzzleMoves([{ san: 'e4', note: '   ' }])).toEqual([{ san: 'e4', note: null }]);
  });

  it('trims edges of non-empty notes and preserves san', () => {
    expect(
      normalizePuzzleMoves([
        { san: 'e4', note: '  kept  ' },
        { san: 'e5', note: null },
        { san: 'Nf3', note: undefined },
      ])
    ).toEqual([
      { san: 'e4', note: 'kept' },
      { san: 'e5', note: null },
      { san: 'Nf3', note: null },
    ]);
  });
});
