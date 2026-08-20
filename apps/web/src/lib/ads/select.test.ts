import { describe, expect, it } from 'vitest';

import { pickCreative } from './select';

/** Fixed source: no global `Math.random` spying, no `restoreAllMocks`. */
const rngReturning = (value: number) => () => value;

describe('pickCreative', () => {
  const pool = ['a', 'b', 'c'];

  it('priority returns the top (first) creative', () => {
    expect(pickCreative(pool, 'priority')).toBe('a');
  });

  it('priority ignores the random source entirely', () => {
    expect(pickCreative(pool, 'priority', rngReturning(0.99))).toBe('a');
  });

  it('rotation maps the random value to the expected index', () => {
    expect(pickCreative(pool, 'rotation', rngReturning(0))).toBe('a');
    expect(pickCreative(pool, 'rotation', rngReturning(0.5))).toBe('b'); // floor(1.5)
    expect(pickCreative(pool, 'rotation', rngReturning(0.9999))).toBe('c'); // floor(2.99)
  });

  it('rotation covers every element across the unit interval', () => {
    // Replaces a 50-iteration fuzz loop that could only assert membership:
    // with the source injected, the mapping itself is checkable.
    const picks = [0, 0.34, 0.67, 0.999].map((r) =>
      pickCreative(pool, 'rotation', rngReturning(r))
    );
    expect(new Set(picks)).toEqual(new Set(pool));
  });

  it('defaults to Math.random and stays inside the pool', () => {
    for (let i = 0; i < 20; i++) {
      expect(pool).toContain(pickCreative(pool, 'rotation'));
    }
  });

  it('single-element pool returns that element for both selections', () => {
    expect(pickCreative(['only'], 'priority')).toBe('only');
    expect(pickCreative(['only'], 'rotation', rngReturning(0.5))).toBe('only');
  });
});
