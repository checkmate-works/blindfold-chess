import { describe, expect, it } from 'vitest';

import { meanThinkMs } from './signals';

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
