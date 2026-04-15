import { describe, expect, it, vi } from 'vitest';

import { selectInitialPositions } from './select-initial-positions';

vi.mock('@blindfold-chess/features/common', async () => {
  const actual = await vi.importActual<typeof import('@blindfold-chess/features/common')>(
    '@blindfold-chess/features/common'
  );
  return {
    ...actual,
    // Deterministic "shuffle": reverse the array so we can assert ordering.
    shuffleArray: <T>(arr: T[]): T[] => [...arr].reverse(),
  };
});

vi.mock('../_data/positions', () => ({
  getFenPositions: () => [
    { fen: 'default1 w - - 0 1', isBlackToMove: false },
    { fen: 'default2 b - - 0 1', isBlackToMove: true },
    { fen: 'default3 w - - 0 1', isBlackToMove: false },
  ],
}));

describe('selectInitialPositions', () => {
  it('returns a single position when customFen is provided (white to move)', () => {
    const result = selectInitialPositions(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      undefined,
      10,
      true
    );
    expect(result).toEqual([
      {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        isBlackToMove: false,
      },
    ]);
  });

  it('detects black to move from customFen', () => {
    const result = selectInitialPositions('8/8/8/8/8/8/8/8 b - - 0 1', undefined, 10, false);
    expect(result).toEqual([{ fen: '8/8/8/8/8/8/8/8 b - - 0 1', isBlackToMove: true }]);
  });

  it('customFen takes precedence over fens array', () => {
    const result = selectInitialPositions('custom w - - 0 1', ['ignored w - - 0 1'], 10, true);
    expect(result).toHaveLength(1);
    expect(result[0].fen).toBe('custom w - - 0 1');
  });

  it('maps fens array without shuffle and slices to problemCount', () => {
    const result = selectInitialPositions(
      undefined,
      ['a w - - 0 1', 'b b - - 0 1', 'c w - - 0 1'],
      2,
      false
    );
    expect(result).toEqual([
      { fen: 'a w - - 0 1', isBlackToMove: false },
      { fen: 'b b - - 0 1', isBlackToMove: true },
    ]);
  });

  it('shuffles fens array when shuffle=true, then slices', () => {
    const result = selectInitialPositions(
      undefined,
      ['a w - - 0 1', 'b w - - 0 1', 'c w - - 0 1'],
      2,
      true
    );
    // Our mocked shuffleArray reverses: [c, b, a], sliced to 2 = [c, b]
    expect(result.map((p) => p.fen)).toEqual(['c w - - 0 1', 'b w - - 0 1']);
  });

  it('falls back to default positions when neither customFen nor fens are provided', () => {
    const result = selectInitialPositions(undefined, undefined, 2, false);
    expect(result).toHaveLength(2);
    expect(result[0].fen).toBe('default1 w - - 0 1');
    expect(result[1].fen).toBe('default2 b - - 0 1');
  });

  it('shuffles default positions when shuffle=true', () => {
    const result = selectInitialPositions(undefined, undefined, 3, true);
    expect(result.map((p) => p.fen)).toEqual([
      'default3 w - - 0 1',
      'default2 b - - 0 1',
      'default1 w - - 0 1',
    ]);
  });

  it('returns empty array when fens is an empty array (falls through to default)', () => {
    const result = selectInitialPositions(undefined, [], 2, false);
    expect(result).toHaveLength(2);
    expect(result[0].fen).toBe('default1 w - - 0 1');
  });
});
