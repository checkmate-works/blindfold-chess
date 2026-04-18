import { describe, expect, it } from 'vitest';

import { getPositionDetailPath } from './routes';

describe('getPositionDetailPath', () => {
  it('routes memory-type positions to the position-memory detail page', () => {
    expect(getPositionDetailPath('memory', 'abc')).toBe('/practice/position-memory/abc');
  });

  it('routes puzzle-type positions to the puzzle detail page', () => {
    expect(getPositionDetailPath('puzzle', 'abc')).toBe('/practice/puzzle/abc');
  });

  it('returns null for sequence-type positions (no detail page implemented)', () => {
    expect(getPositionDetailPath('sequence', 'abc')).toBeNull();
  });
});
