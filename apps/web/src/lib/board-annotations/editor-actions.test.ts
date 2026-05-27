import { describe, expect, it } from 'vitest';

import { colorFromModifiers, pointerToSquare, toggleArrow, toggleCircle } from './editor-actions';
import type { BoardAnnotations } from './types';

const EMPTY: BoardAnnotations = { arrows: [], circles: [] };

describe('toggleArrow', () => {
  it('adds a new arrow when none exists for the slot', () => {
    const result = toggleArrow(EMPTY, 'e2', 'e4', 'green');
    expect(result.arrows).toEqual([{ from: 'e2', to: 'e4', color: 'green' }]);
  });

  it('removes the arrow when the same color is toggled', () => {
    const start: BoardAnnotations = {
      arrows: [{ from: 'e2', to: 'e4', color: 'green' }],
      circles: [],
    };
    const result = toggleArrow(start, 'e2', 'e4', 'green');
    expect(result.arrows).toEqual([]);
  });

  it('replaces the color when a different color is applied to the same slot', () => {
    const start: BoardAnnotations = {
      arrows: [{ from: 'e2', to: 'e4', color: 'green' }],
      circles: [],
    };
    const result = toggleArrow(start, 'e2', 'e4', 'red');
    expect(result.arrows).toEqual([{ from: 'e2', to: 'e4', color: 'red' }]);
  });

  it('leaves circles untouched', () => {
    const start: BoardAnnotations = {
      arrows: [],
      circles: [{ square: 'd5', color: 'yellow' }],
    };
    const result = toggleArrow(start, 'e2', 'e4', 'green');
    expect(result.circles).toEqual([{ square: 'd5', color: 'yellow' }]);
  });
});

describe('toggleCircle', () => {
  it('adds a new circle when none exists for the square', () => {
    const result = toggleCircle(EMPTY, 'd5', 'yellow');
    expect(result.circles).toEqual([{ square: 'd5', color: 'yellow' }]);
  });

  it('removes the circle when the same color is toggled', () => {
    const start: BoardAnnotations = {
      arrows: [],
      circles: [{ square: 'd5', color: 'yellow' }],
    };
    const result = toggleCircle(start, 'd5', 'yellow');
    expect(result.circles).toEqual([]);
  });

  it('replaces the color when a different color is applied to the same square', () => {
    const start: BoardAnnotations = {
      arrows: [],
      circles: [{ square: 'd5', color: 'yellow' }],
    };
    const result = toggleCircle(start, 'd5', 'green');
    expect(result.circles).toEqual([{ square: 'd5', color: 'green' }]);
  });
});

describe('colorFromModifiers', () => {
  const base = { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };

  it('returns green when no modifier is held', () => {
    expect(colorFromModifiers(base)).toBe('green');
  });
  it('returns red on shift', () => {
    expect(colorFromModifiers({ ...base, shiftKey: true })).toBe('red');
  });
  it('returns blue on alt', () => {
    expect(colorFromModifiers({ ...base, altKey: true })).toBe('blue');
  });
  it('returns yellow on ctrl', () => {
    expect(colorFromModifiers({ ...base, ctrlKey: true })).toBe('yellow');
  });
  it('returns yellow on meta', () => {
    expect(colorFromModifiers({ ...base, metaKey: true })).toBe('yellow');
  });
  it('prefers shift over other modifiers when multiple are held', () => {
    expect(colorFromModifiers({ shiftKey: true, altKey: true, ctrlKey: true, metaKey: true })).toBe(
      'red'
    );
  });
});

describe('pointerToSquare', () => {
  const rect = { left: 0, top: 0, width: 800, height: 800 };

  it('maps top-left to a8 when not flipped', () => {
    expect(pointerToSquare(10, 10, rect, false)).toBe('a8');
  });

  it('maps bottom-right to h1 when not flipped', () => {
    expect(pointerToSquare(799, 799, rect, false)).toBe('h1');
  });

  it('maps top-left to h1 when flipped', () => {
    expect(pointerToSquare(10, 10, rect, true)).toBe('h1');
  });

  it('returns null for clicks outside the rect', () => {
    expect(pointerToSquare(-1, 50, rect, false)).toBeNull();
    expect(pointerToSquare(800, 50, rect, false)).toBeNull();
    expect(pointerToSquare(50, -5, rect, false)).toBeNull();
  });

  it('honours non-zero rect offsets', () => {
    const offset = { left: 100, top: 200, width: 800, height: 800 };
    // 350 - 100 = 250 → col = floor(250 / 800 * 8) = 2 (file c)
    // 250 - 200 = 50 → row = floor(50 / 800 * 8) = 0 (rank 8)
    expect(pointerToSquare(350, 250, offset, false)).toBe('c8');
  });

  it('rounds inward at fractional edges (no off-by-one at exact column boundaries)', () => {
    // x at exactly the right edge of file a → still inside a-file
    expect(pointerToSquare(99, 50, rect, false)).toBe('a8');
    // x just into b-file
    expect(pointerToSquare(100, 50, rect, false)).toBe('b8');
  });

  it('returns null for zero-sized rects (no division by zero)', () => {
    expect(pointerToSquare(0, 0, { left: 0, top: 0, width: 0, height: 0 }, false)).toBeNull();
  });
});
