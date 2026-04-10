import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TIME_LIMIT,
  MAX_TIME_LIMIT,
  MIN_TIME_LIMIT,
  clampTimeLimit,
} from './session-config';

describe('clampTimeLimit', () => {
  it('returns a value inside the range unchanged', () => {
    expect(clampTimeLimit('30')).toBe(30);
  });

  it('clamps values below the minimum up to MIN_TIME_LIMIT', () => {
    expect(clampTimeLimit('1')).toBe(MIN_TIME_LIMIT);
    expect(clampTimeLimit('-100')).toBe(MIN_TIME_LIMIT);
  });

  it('clamps values above the maximum down to MAX_TIME_LIMIT', () => {
    expect(clampTimeLimit('9999')).toBe(MAX_TIME_LIMIT);
  });

  it('accepts the exact MIN and MAX boundary values', () => {
    expect(clampTimeLimit(String(MIN_TIME_LIMIT))).toBe(MIN_TIME_LIMIT);
    expect(clampTimeLimit(String(MAX_TIME_LIMIT))).toBe(MAX_TIME_LIMIT);
  });

  it('falls back to DEFAULT_TIME_LIMIT for non-string or non-numeric input', () => {
    expect(clampTimeLimit(undefined)).toBe(DEFAULT_TIME_LIMIT);
    expect(clampTimeLimit(null)).toBe(DEFAULT_TIME_LIMIT);
    expect(clampTimeLimit('abc')).toBe(DEFAULT_TIME_LIMIT);
    expect(clampTimeLimit(30)).toBe(DEFAULT_TIME_LIMIT);
  });
});
