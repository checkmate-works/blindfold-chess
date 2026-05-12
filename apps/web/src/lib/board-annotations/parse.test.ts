import { describe, expect, it } from 'vitest';

import { parseBoardAnnotations } from './parse';
import { EMPTY_BOARD_ANNOTATIONS } from './types';

describe('parseBoardAnnotations', () => {
  it('returns the shared empty singleton for null/undefined', () => {
    expect(parseBoardAnnotations(null)).toBe(EMPTY_BOARD_ANNOTATIONS);
    expect(parseBoardAnnotations(undefined)).toBe(EMPTY_BOARD_ANNOTATIONS);
  });

  it('returns empty singleton for non-objects', () => {
    expect(parseBoardAnnotations('foo')).toBe(EMPTY_BOARD_ANNOTATIONS);
    expect(parseBoardAnnotations(42)).toBe(EMPTY_BOARD_ANNOTATIONS);
    expect(parseBoardAnnotations([])).toBe(EMPTY_BOARD_ANNOTATIONS);
  });

  it('returns empty singleton when both arrays are missing or empty', () => {
    expect(parseBoardAnnotations({})).toBe(EMPTY_BOARD_ANNOTATIONS);
    expect(parseBoardAnnotations({ arrows: [], circles: [] })).toBe(EMPTY_BOARD_ANNOTATIONS);
  });

  it('parses valid arrows and circles', () => {
    const result = parseBoardAnnotations({
      arrows: [{ from: 'e2', to: 'e4', color: 'green' }],
      circles: [{ square: 'd5', color: 'red' }],
    });
    expect(result.arrows).toEqual([{ from: 'e2', to: 'e4', color: 'green' }]);
    expect(result.circles).toEqual([{ square: 'd5', color: 'red' }]);
  });

  it('drops invalid squares', () => {
    const result = parseBoardAnnotations({
      arrows: [
        { from: 'e2', to: 'e4', color: 'green' },
        { from: 'z9', to: 'e4', color: 'green' },
        { from: 'e2', to: 'i4', color: 'green' },
      ],
      circles: [
        { square: 'd5', color: 'red' },
        { square: 'd9', color: 'red' },
        { square: 'D5', color: 'red' }, // uppercase rejected
      ],
    });
    expect(result.arrows).toHaveLength(1);
    expect(result.circles).toHaveLength(1);
  });

  it('drops invalid colors', () => {
    const result = parseBoardAnnotations({
      arrows: [
        { from: 'e2', to: 'e4', color: 'green' },
        { from: 'e2', to: 'e4', color: 'orange' },
      ],
      circles: [
        { square: 'd5', color: 'blue' },
        { square: 'd5', color: '' },
      ],
    });
    expect(result.arrows).toHaveLength(1);
    expect(result.circles).toHaveLength(1);
  });

  it('drops zero-length arrows', () => {
    const result = parseBoardAnnotations({
      arrows: [
        { from: 'e2', to: 'e2', color: 'green' },
        { from: 'e2', to: 'e4', color: 'green' },
      ],
    });
    expect(result.arrows).toHaveLength(1);
    expect(result.arrows[0].from).toBe('e2');
    expect(result.arrows[0].to).toBe('e4');
  });

  it('tolerates non-array values for arrows/circles', () => {
    const result = parseBoardAnnotations({ arrows: 'nope', circles: { square: 'd5' } });
    expect(result).toBe(EMPTY_BOARD_ANNOTATIONS);
  });

  it('ignores unrelated keys', () => {
    const input: unknown = {
      arrows: [{ from: 'e2', to: 'e4', color: 'green' }],
      circles: [],
      extra: 'whatever',
    };
    const result = parseBoardAnnotations(input);
    expect(result.arrows).toHaveLength(1);
  });
});
