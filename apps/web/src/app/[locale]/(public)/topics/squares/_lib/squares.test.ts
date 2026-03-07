import { describe, expect, it } from 'vitest';

import { getAllSquares, isLightSquare, isValidSquare } from './squares';

describe('isValidSquare', () => {
  describe('valid squares', () => {
    it('should accept all corner squares', () => {
      expect(isValidSquare('a1')).toBe(true);
      expect(isValidSquare('a8')).toBe(true);
      expect(isValidSquare('h1')).toBe(true);
      expect(isValidSquare('h8')).toBe(true);
    });

    it('should accept center squares', () => {
      expect(isValidSquare('e4')).toBe(true);
      expect(isValidSquare('d5')).toBe(true);
      expect(isValidSquare('d4')).toBe(true);
      expect(isValidSquare('e5')).toBe(true);
    });

    it('should accept all 64 valid squares', () => {
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
      let count = 0;
      for (const file of files) {
        for (const rank of ranks) {
          expect(isValidSquare(`${file}${rank}`)).toBe(true);
          count++;
        }
      }
      expect(count).toBe(64);
    });
  });

  describe('invalid squares', () => {
    it('should reject squares with invalid file', () => {
      expect(isValidSquare('i1')).toBe(false);
      expect(isValidSquare('z5')).toBe(false);
    });

    it('should reject squares with invalid rank', () => {
      expect(isValidSquare('a0')).toBe(false);
      expect(isValidSquare('a9')).toBe(false);
      expect(isValidSquare('h0')).toBe(false);
    });

    it('should reject completely invalid input', () => {
      expect(isValidSquare('z9')).toBe(false);
      expect(isValidSquare('i9')).toBe(false);
    });

    it('should reject reversed order (rank then file)', () => {
      expect(isValidSquare('1a')).toBe(false);
      expect(isValidSquare('4e')).toBe(false);
    });

    it('should reject uppercase files', () => {
      expect(isValidSquare('A1')).toBe(false);
      expect(isValidSquare('H8')).toBe(false);
      expect(isValidSquare('E4')).toBe(false);
    });

    it('should reject strings that are too short', () => {
      expect(isValidSquare('')).toBe(false);
      expect(isValidSquare('a')).toBe(false);
      expect(isValidSquare('1')).toBe(false);
    });

    it('should reject strings that are too long', () => {
      expect(isValidSquare('a1b')).toBe(false);
      expect(isValidSquare('a1b2')).toBe(false);
      expect(isValidSquare('aa1')).toBe(false);
    });

    it('should reject special characters', () => {
      expect(isValidSquare('a!')).toBe(false);
      expect(isValidSquare('#1')).toBe(false);
      expect(isValidSquare('$$')).toBe(false);
      expect(isValidSquare('a ')).toBe(false);
      expect(isValidSquare(' 1')).toBe(false);
    });

    it('should reject double letters and double digits', () => {
      expect(isValidSquare('aa')).toBe(false);
      expect(isValidSquare('11')).toBe(false);
      expect(isValidSquare('hh')).toBe(false);
      expect(isValidSquare('88')).toBe(false);
    });
  });
});

describe('getAllSquares', () => {
  it('should return exactly 64 squares', () => {
    const squares = getAllSquares();
    expect(squares).toHaveLength(64);
  });

  it('should return all unique squares', () => {
    const squares = getAllSquares();
    const unique = new Set(squares);
    expect(unique.size).toBe(64);
  });

  it('should contain all valid squares', () => {
    const squares = getAllSquares();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    for (const file of files) {
      for (const rank of ranks) {
        expect(squares).toContain(`${file}${rank}`);
      }
    }
  });

  it('should return squares ordered by rank descending (8 to 1), then file ascending (a to h)', () => {
    const squares = getAllSquares();
    // First square should be a8 (rank 8, file a)
    expect(squares[0]).toBe('a8');
    // Second should be b8
    expect(squares[1]).toBe('b8');
    // Last should be h1
    expect(squares[63]).toBe('h1');
    // First of rank 1 should be at index 56
    expect(squares[56]).toBe('a1');
  });
});

describe('isLightSquare', () => {
  it('should identify a1 as dark (bottom-left is always dark)', () => {
    expect(isLightSquare('a1')).toBe(false);
  });

  it('should identify h1 as light', () => {
    expect(isLightSquare('h1')).toBe(true);
  });

  it('should identify a8 as light', () => {
    expect(isLightSquare('a8')).toBe(true);
  });

  it('should identify h8 as dark', () => {
    expect(isLightSquare('h8')).toBe(false);
  });

  it('should alternate correctly along a rank', () => {
    // Rank 1: a1=dark, b1=light, c1=dark, d1=light, ...
    expect(isLightSquare('a1')).toBe(false);
    expect(isLightSquare('b1')).toBe(true);
    expect(isLightSquare('c1')).toBe(false);
    expect(isLightSquare('d1')).toBe(true);
    expect(isLightSquare('e1')).toBe(false);
    expect(isLightSquare('f1')).toBe(true);
    expect(isLightSquare('g1')).toBe(false);
    expect(isLightSquare('h1')).toBe(true);
  });

  it('should alternate correctly along a file', () => {
    // File a: a1=dark, a2=light, a3=dark, a4=light, ...
    expect(isLightSquare('a1')).toBe(false);
    expect(isLightSquare('a2')).toBe(true);
    expect(isLightSquare('a3')).toBe(false);
    expect(isLightSquare('a4')).toBe(true);
  });

  it('should have exactly 32 light squares and 32 dark squares', () => {
    const allSquares = getAllSquares();
    const lightCount = allSquares.filter((sq) => isLightSquare(sq)).length;
    const darkCount = allSquares.filter((sq) => !isLightSquare(sq)).length;
    expect(lightCount).toBe(32);
    expect(darkCount).toBe(32);
  });
});
