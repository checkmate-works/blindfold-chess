import { describe, expect, it } from 'vitest';

import { startedFromStandardPosition } from './standard-start';

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ENDGAME_FEN = '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';

describe('startedFromStandardPosition', () => {
  it('passes when neither field is recorded (ordinary / legacy games)', () => {
    expect(startedFromStandardPosition(null, null)).toBe(true);
    expect(startedFromStandardPosition(undefined, undefined)).toBe(true);
  });

  it('passes an explicit standard startingFen with no setup prefix', () => {
    expect(startedFromStandardPosition(STANDARD_FEN, 0)).toBe(true);
  });

  it('ignores move counters when comparing the starting position', () => {
    expect(
      startedFromStandardPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 5 12', null)
    ).toBe(true);
  });

  it('fails a custom starting position', () => {
    expect(startedFromStandardPosition(ENDGAME_FEN, null)).toBe(false);
  });

  it('fails a seeded setup prefix even from the standard position', () => {
    expect(startedFromStandardPosition(STANDARD_FEN, 8)).toBe(false);
    expect(startedFromStandardPosition(null, 1)).toBe(false);
  });
});
