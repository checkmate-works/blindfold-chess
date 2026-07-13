import { describe, expect, it } from 'vitest';

import {
  computeContinuation,
  computeCurrentPly,
  computeInitialFlipped,
  computePlayerMoveIndices,
  formatMoveLabel,
  formatSetupMovesLine,
} from './replay-derivations';

const MOVES = ['d4', 'd5', 'c4', 'e6'];

describe('computeInitialFlipped', () => {
  it('defaults to the player side when no orientation is requested', () => {
    expect(computeInitialFlipped(undefined, 'white')).toBe(false);
    expect(computeInitialFlipped(undefined, 'black')).toBe(false);
  });

  it('converts the requested bottom side into the manual-toggle seed', () => {
    expect(computeInitialFlipped('black', 'white')).toBe(true);
    expect(computeInitialFlipped('white', 'white')).toBe(false);
    // A black player's board is already flipped; the seed inverts.
    expect(computeInitialFlipped('black', 'black')).toBe(false);
    expect(computeInitialFlipped('white', 'black')).toBe(true);
  });
});

describe('computeCurrentPly', () => {
  it('passes a concrete move index through', () => {
    expect(computeCurrentPly(2, 4)).toBe(2);
  });

  it('anchors the latest position (-1) to the last move', () => {
    expect(computeCurrentPly(-1, 4)).toBe(3);
    expect(computeCurrentPly(-1, 0)).toBeNull();
  });

  it('anchors the initial board (-2) to the whole game', () => {
    expect(computeCurrentPly(-2, 4)).toBeNull();
  });
});

describe('computeContinuation', () => {
  it('returns the next move from a mid-game position', () => {
    expect(computeContinuation(1, MOVES)).toEqual({ appliedPlies: 2, continuationSan: 'c4' });
  });

  it('returns the first move from the initial board', () => {
    expect(computeContinuation(-2, MOVES)).toEqual({ appliedPlies: 0, continuationSan: 'd4' });
  });

  it('has no continuation at the latest position', () => {
    expect(computeContinuation(-1, MOVES)).toEqual({
      appliedPlies: 4,
      continuationSan: undefined,
    });
  });
});

describe('formatMoveLabel', () => {
  it('labels white and black moves PGN-style from the standard start', () => {
    expect(formatMoveLabel(0, MOVES, null)).toBe('1. d4');
    expect(formatMoveLabel(1, MOVES, null)).toBe('1...d5');
    expect(formatMoveLabel(2, MOVES, null)).toBe('2. c4');
  });

  it('returns null for the whole-game anchor and out-of-range plies', () => {
    expect(formatMoveLabel(null, MOVES, null)).toBeNull();
    expect(formatMoveLabel(9, MOVES, null)).toBeNull();
  });

  it('respects a custom starting FEN with black to move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 3';
    expect(formatMoveLabel(0, ['d5'], fen)).toBe('3...d5');
  });
});

describe('computePlayerMoveIndices', () => {
  it('picks the even plies for white from the standard start', () => {
    expect(computePlayerMoveIndices(4, undefined, 'white')).toEqual([0, 2]);
    expect(computePlayerMoveIndices(4, undefined, 'black')).toEqual([1, 3]);
  });

  it('skips the seeded setup prefix', () => {
    expect(computePlayerMoveIndices(8, undefined, 'white', 4)).toEqual([4, 6]);
    expect(computePlayerMoveIndices(8, undefined, 'black', 4)).toEqual([5, 7]);
  });
});

describe('formatSetupMovesLine', () => {
  it('renders the prefix in PGN style with move numbers', () => {
    expect(formatSetupMovesLine(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 5, null)).toBe(
      '1. e4 e5 2. Nf3 Nc6 3. Bb5'
    );
    expect(formatSetupMovesLine(MOVES, 3, null)).toBe('1. d4 d5 2. c4');
  });

  it('numbers from the starting FEN, including a black-to-move start', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 3';
    expect(formatSetupMovesLine(['d5', 'c4'], 2, fen)).toBe('3... d5 4. c4');
  });

  it('returns null for an empty prefix and clamps to the move list', () => {
    expect(formatSetupMovesLine(MOVES, 0, null)).toBeNull();
    expect(formatSetupMovesLine(['e4'], 3, null)).toBe('1. e4');
  });
});
