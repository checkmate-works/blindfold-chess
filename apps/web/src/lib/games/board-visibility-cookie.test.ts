import { describe, expect, it } from 'vitest';

import { DEFAULT_BOARD_VISIBILITY } from './board-visibility';
import { parseBoardVisibilityCookie } from './board-visibility-cookie';

describe('parseBoardVisibilityCookie', () => {
  it('parses each valid board-visibility value', () => {
    expect(parseBoardVisibilityCookie('always')).toBe('always');
    expect(parseBoardVisibilityCookie('peek')).toBe('peek');
    expect(parseBoardVisibilityCookie('never')).toBe('never');
  });

  it('returns the default for null / undefined / empty (no cookie set)', () => {
    expect(parseBoardVisibilityCookie(null)).toBe(DEFAULT_BOARD_VISIBILITY);
    expect(parseBoardVisibilityCookie(undefined)).toBe(DEFAULT_BOARD_VISIBILITY);
    expect(parseBoardVisibilityCookie('')).toBe(DEFAULT_BOARD_VISIBILITY);
  });

  it('returns the default for unknown / malformed values', () => {
    expect(parseBoardVisibilityCookie('bogus')).toBe(DEFAULT_BOARD_VISIBILITY);
    // Case-sensitive: the closed set is lowercase only.
    expect(parseBoardVisibilityCookie('Never')).toBe(DEFAULT_BOARD_VISIBILITY);
  });

  it('tolerates very long untrusted input without throwing', () => {
    expect(parseBoardVisibilityCookie('x'.repeat(10_000))).toBe(DEFAULT_BOARD_VISIBILITY);
  });
});
