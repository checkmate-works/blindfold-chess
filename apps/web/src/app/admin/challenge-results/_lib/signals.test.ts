import { describe, expect, it } from 'vitest';

import { meanThinkMs, parseMaxPace, secondsPerAnswer } from './signals';

describe('meanThinkMs', () => {
  it('divides the thinking time by every answer, points and mistakes alike', () => {
    expect(meanThinkMs({ elapsedMs: 12_000, score: 8, incorrectAnswers: 2 })).toBe(1_200);
  });

  it('counts an attempt of only mistakes', () => {
    expect(meanThinkMs({ elapsedMs: 3_000, score: 0, incorrectAnswers: 3 })).toBe(1_000);
  });

  it('keeps the fraction for the caller to round', () => {
    expect(meanThinkMs({ elapsedMs: 1_000, score: 3, incorrectAnswers: 0 })).toBeCloseTo(
      333.333,
      3
    );
  });

  it('returns null for an attempt that took no answers', () => {
    expect(meanThinkMs({ elapsedMs: 0, score: 0, incorrectAnswers: 0 })).toBeNull();
  });

  it('returns null rather than dividing by zero when time ran without an answer', () => {
    expect(meanThinkMs({ elapsedMs: 5_000, score: 0, incorrectAnswers: 0 })).toBeNull();
  });
});

describe('secondsPerAnswer', () => {
  it('divides the recorded time by points and mistakes together', () => {
    expect(secondsPerAnswer({ timeTaken: 30, score: 20, incorrectAnswers: 4 })).toBe(1.25);
  });

  it('returns null for a result with no answers', () => {
    expect(secondsPerAnswer({ timeTaken: 30, score: 0, incorrectAnswers: 0 })).toBeNull();
  });

  it('reads a zero-second result as a pace of zero, the fastest there is', () => {
    expect(secondsPerAnswer({ timeTaken: 0, score: 50, incorrectAnswers: 0 })).toBe(0);
  });
});

describe('parseMaxPace', () => {
  it('keeps a positive bound', () => {
    expect(parseMaxPace(0.8)).toBe(0.8);
  });

  it.each([null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])('drops %s', (value) => {
    expect(parseMaxPace(value)).toBeNull();
  });
});
