import { describe, expect, it } from 'vitest';

import { formatTime } from '../utils';

describe('formatTime', () => {
  it('returns seconds only when less than 60', () => {
    expect(formatTime(30)).toBe('30s');
  });

  it('returns 0s for zero', () => {
    expect(formatTime(0)).toBe('0s');
  });

  it('returns minutes and seconds when 60 or more', () => {
    expect(formatTime(90)).toBe('1m 30s');
  });

  it('returns minutes and 0s when exact minutes', () => {
    expect(formatTime(120)).toBe('2m 0s');
  });

  it('handles large values', () => {
    expect(formatTime(3661)).toBe('61m 1s');
  });

  // Edge cases
  it('returns exactly 1m 0s for 60 seconds (boundary)', () => {
    expect(formatTime(60)).toBe('1m 0s');
  });

  it('returns 59s for 59 seconds (just below boundary)', () => {
    expect(formatTime(59)).toBe('59s');
  });

  it('returns 1s for 1 second', () => {
    expect(formatTime(1)).toBe('1s');
  });

  it('handles fractional seconds below 60', () => {
    expect(formatTime(30.5)).toBe('30.5s');
  });

  it('handles negative values', () => {
    // Math.floor(-1/60) = -1, but -1 > 0 is false, so it returns secs only
    expect(formatTime(-1)).toBe('-1s');
  });

  it('handles NaN input', () => {
    expect(formatTime(NaN)).toBe('NaNs');
  });

  it('handles Infinity input', () => {
    expect(formatTime(Infinity)).toBe('Infinitym NaNs');
  });

  it('handles -Infinity input', () => {
    // Math.floor(-Infinity/60) = -Infinity, which is not > 0
    expect(formatTime(-Infinity)).toBe('NaNs');
  });
});
