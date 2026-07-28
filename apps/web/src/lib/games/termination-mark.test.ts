import { describe, expect, it } from 'vitest';

import { isFinalPosition, resolveLosingColor, resolveTerminationMark } from './termination-mark';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// Scholar's mate: black is mated, black king still on e8.
const SCHOLARS_MATE = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';

describe('resolveLosingColor', () => {
  it('names the opponent when the player won', () => {
    expect(resolveLosingColor('win', 'white')).toBe('b');
    expect(resolveLosingColor('win', 'black')).toBe('w');
  });

  it('names the player when the player lost', () => {
    expect(resolveLosingColor('loss', 'white')).toBe('w');
    expect(resolveLosingColor('loss', 'black')).toBe('b');
  });

  it('nobody loses a draw or an unfinished game', () => {
    expect(resolveLosingColor('draw', 'white')).toBeNull();
    expect(resolveLosingColor(null, 'white')).toBeNull();
  });
});

describe('resolveTerminationMark', () => {
  it('marks the mated king', () => {
    expect(
      resolveTerminationMark({ fen: SCHOLARS_MATE, losingColor: 'b', isCheckmate: true })
    ).toEqual({ square: 'e8', kind: 'checkmate' });
  });

  it('marks a resignation on a position that is not mate', () => {
    expect(resolveTerminationMark({ fen: START, losingColor: 'w', isCheckmate: false })).toEqual({
      square: 'e1',
      kind: 'resignation',
    });
  });

  it('locates a king that has moved off its home square', () => {
    // White king on c3, black king on h8.
    const fen = '7k/8/8/8/8/2K5/8/8 w - - 0 1';
    expect(resolveTerminationMark({ fen, losingColor: 'w', isCheckmate: false })?.square).toBe(
      'c3'
    );
    expect(resolveTerminationMark({ fen, losingColor: 'b', isCheckmate: false })?.square).toBe(
      'h8'
    );
  });

  it('marks nothing when nobody lost', () => {
    expect(
      resolveTerminationMark({ fen: START, losingColor: null, isCheckmate: false })
    ).toBeNull();
  });

  it('marks nothing when the losing king is not on the board', () => {
    expect(
      resolveTerminationMark({
        fen: '7k/8/8/8/8/8/8/8 w - - 0 1',
        losingColor: 'w',
        isCheckmate: true,
      })
    ).toBeNull();
  });
});

describe('isFinalPosition', () => {
  it('accepts the "latest" sentinel', () => {
    expect(isFinalPosition(-1, 34)).toBe(true);
  });

  it('accepts the last ply addressed by index (a #34-style deep link)', () => {
    expect(isFinalPosition(33, 34)).toBe(true);
  });

  it('rejects any earlier ply and the pre-game overview board', () => {
    expect(isFinalPosition(32, 34)).toBe(false);
    expect(isFinalPosition(0, 34)).toBe(false);
    expect(isFinalPosition(-2, 34)).toBe(false);
  });

  it('does not mistake the overview of an empty game for its end', () => {
    expect(isFinalPosition(-2, 0)).toBe(false);
  });
});
