import { describe, expect, it } from 'vitest';

import { parseAttemptSquares } from './parse-attempt-squares';

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
