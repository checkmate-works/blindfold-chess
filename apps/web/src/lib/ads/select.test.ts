import { afterEach, describe, expect, it, vi } from 'vitest';

import { pickCreative } from './select';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('pickCreative', () => {
  const pool = ['a', 'b', 'c'];

  it('priority returns the top (first) creative', () => {
    expect(pickCreative(pool, 'priority')).toBe('a');
  });

  it('priority always returns the same element regardless of Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(pickCreative(pool, 'priority')).toBe('a');
  });

  it('rotation returns an element within the pool', () => {
    for (let i = 0; i < 50; i++) {
      expect(pool).toContain(pickCreative(pool, 'rotation'));
    }
  });

  it('rotation maps the random value to the expected index', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // → index 0
    expect(pickCreative(pool, 'rotation')).toBe('a');
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // → floor(1.5) = 1
    expect(pickCreative(pool, 'rotation')).toBe('b');
    vi.spyOn(Math, 'random').mockReturnValue(0.9999); // → floor(2.99) = 2
    expect(pickCreative(pool, 'rotation')).toBe('c');
  });

  it('single-element pool returns that element for both selections', () => {
    expect(pickCreative(['only'], 'priority')).toBe('only');
    expect(pickCreative(['only'], 'rotation')).toBe('only');
  });
});
