import { describe, expect, it } from 'vitest';

import { parseAttemptSquares, resolveIllegalAttemptSquares } from './illegal-attempts';
import type { MoveOperationLog } from './saved-game-types';

function log(overrides: Partial<MoveOperationLog> = {}): MoveOperationLog {
  return {
    inputMethod: 'board',
    peekCount: 0,
    undoCount: 0,
    movePeekCount: 0,
    ...overrides,
  };
}

describe('parseAttemptSquares', () => {
  it('recovers both squares from board coordinate long form', () => {
    expect(parseAttemptSquares('e2-e4', 'white')).toEqual({ from: 'e2', to: 'e4' });
  });

  it('recovers castling squares from playerColor, for both castle directions and both colors', () => {
    expect(parseAttemptSquares('O-O', 'white')).toEqual({ from: 'e1', to: 'g1' });
    expect(parseAttemptSquares('O-O-O', 'white')).toEqual({ from: 'e1', to: 'c1' });
    expect(parseAttemptSquares('O-O', 'black')).toEqual({ from: 'e8', to: 'g8' });
    expect(parseAttemptSquares('O-O-O', 'black')).toEqual({ from: 'e8', to: 'c8' });
    // Digit-zero variant and a trailing check mark
    expect(parseAttemptSquares('0-0', 'white')).toEqual({ from: 'e1', to: 'g1' });
    expect(parseAttemptSquares('O-O+', 'white')).toEqual({ from: 'e1', to: 'g1' });
  });

  it('recovers only the destination for a pawn capture (file alone does not name a square)', () => {
    expect(parseAttemptSquares('exd5', 'white')).toEqual({ to: 'd5' });
  });

  it('recovers only the destination for any other move text, with or without a promotion suffix', () => {
    expect(parseAttemptSquares('Nf3', 'white')).toEqual({ to: 'f3' });
    expect(parseAttemptSquares('Bxb5', 'white')).toEqual({ to: 'b5' });
    expect(parseAttemptSquares('d5', 'white')).toEqual({ to: 'd5' });
    expect(parseAttemptSquares('e8=Q', 'white')).toEqual({ to: 'e8' });
    expect(parseAttemptSquares('Qh5+', 'white')).toEqual({ to: 'h5' });
  });

  it('returns null for unrecognized or garbage input, rather than guessing', () => {
    expect(parseAttemptSquares('hello', 'white')).toBeNull();
    expect(parseAttemptSquares('', 'white')).toBeNull();
    // Publish-time truncation to 12 chars can cut notation off mid-square.
    expect(parseAttemptSquares('asdkfj123456', 'white')).toBeNull();
  });
});

describe('resolveIllegalAttemptSquares', () => {
  it('prefers the squares recorded at rejection time over re-parsing the text', () => {
    // "Nc3" alone cannot name its origin — a recorded board attempt can.
    const entry = log({
      invalidAttempts: ['Nc3'],
      invalidAttemptSquares: [{ from: 'b1', to: 'c3' }],
    });
    expect(resolveIllegalAttemptSquares(entry, 0, 'white')).toEqual({ from: 'b1', to: 'c3' });
  });

  it('falls back to the text for a null slot (a MoveInputPanel attempt)', () => {
    const entry = log({
      invalidAttempts: ['Nc3', 'e2-e4'],
      invalidAttemptSquares: [{ from: 'b1', to: 'c3' }, null],
    });
    expect(resolveIllegalAttemptSquares(entry, 1, 'white')).toEqual({ from: 'e2', to: 'e4' });
  });

  it('falls back to the text for a legacy log with no recorded squares at all', () => {
    const entry = log({ invalidAttempts: ['Nc3'] });
    // Only the destination survives the SAN-like text.
    expect(resolveIllegalAttemptSquares(entry, 0, 'white')).toEqual({ to: 'c3' });
  });

  it('returns null when nothing is markable, so callers can skip the interaction', () => {
    expect(
      resolveIllegalAttemptSquares(log({ invalidAttempts: ['hello'] }), 0, 'white')
    ).toBeNull();
    // Out of range, and a count-only legacy entry with no texts.
    expect(resolveIllegalAttemptSquares(log({ invalidAttempts: ['Nc3'] }), 5, 'white')).toBeNull();
    expect(resolveIllegalAttemptSquares(log({ invalidCount: 2 }), 0, 'white')).toBeNull();
  });
});
