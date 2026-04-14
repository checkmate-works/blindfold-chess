import {
  generateSquareSequence,
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from '@blindfold-chess/features/diagonal-quiz';
import { describe, expect, it } from 'vitest';

describe('getDiagonals', () => {
  describe('corner squares', () => {
    it('returns correct diagonals for a1 (bottom-left corner)', () => {
      const result = getDiagonals('a1');
      // a1-h8 is the main diagonal
      expect(result.diagonal).toBe('a1-h8');
      // a1 is a single-square anti-diagonal (file + rank = 0+0 = 0)
      expect(result.antiDiagonal).toBe('a1');
    });

    it('returns correct diagonals for h8 (top-right corner)', () => {
      const result = getDiagonals('h8');
      // h8 is on the a1-h8 diagonal
      expect(result.diagonal).toBe('a1-h8');
      // h8 is a single-square anti-diagonal (file + rank = 7+7 = 14)
      expect(result.antiDiagonal).toBe('h8');
    });

    it('returns correct diagonals for a8 (top-left corner)', () => {
      const result = getDiagonals('a8');
      // a8 is a single-square diagonal (file - rank = 0-7 = -7)
      expect(result.diagonal).toBe('a8');
      // a8 is on the a8-h1 anti-diagonal
      expect(result.antiDiagonal).toBe('a8-h1');
    });

    it('returns correct diagonals for h1 (bottom-right corner)', () => {
      const result = getDiagonals('h1');
      // h1 is a single-square diagonal (file - rank = 7-0 = 7)
      expect(result.diagonal).toBe('h1');
      // h1 is on the a8-h1 anti-diagonal (file + rank = 7+0 = 7)
      expect(result.antiDiagonal).toBe('a8-h1');
    });
  });

  describe('edge squares', () => {
    it('returns correct diagonals for a4', () => {
      const result = getDiagonals('a4');
      // file - rank = 0-3 = -3, starts at a4, ends at e8
      expect(result.diagonal).toBe('a4-e8');
      // file + rank = 0+3 = 3, starts at d1, ends at a4
      expect(result.antiDiagonal).toBe('a4-d1');
    });

    it('returns correct diagonals for h4', () => {
      const result = getDiagonals('h4');
      // file - rank = 7-3 = 4, starts at e1, ends at h4
      expect(result.diagonal).toBe('e1-h4');
      // file + rank = 7+3 = 10, starts at h4(start), ends at d8 (anti end)
      expect(result.antiDiagonal).toBe('d8-h4');
    });

    it('returns correct diagonals for d1', () => {
      const result = getDiagonals('d1');
      // file - rank = 3-0 = 3, starts at d1, ends at h5
      expect(result.diagonal).toBe('d1-h5');
      // file + rank = 3+0 = 3, starts at d1, ends at a4
      expect(result.antiDiagonal).toBe('a4-d1');
    });

    it('returns correct diagonals for d8', () => {
      const result = getDiagonals('d8');
      // file - rank = 3-7 = -4, starts at a5, ends at d8
      expect(result.diagonal).toBe('a5-d8');
      // file + rank = 3+7 = 10, starts at h4, ends at d8
      expect(result.antiDiagonal).toBe('d8-h4');
    });
  });

  describe('center squares', () => {
    it('returns correct diagonals for e4', () => {
      const result = getDiagonals('e4');
      // file - rank = 4-3 = 1, starts at b1, ends at h7
      expect(result.diagonal).toBe('b1-h7');
      // file + rank = 4+3 = 7, full anti-diagonal a8-h1
      expect(result.antiDiagonal).toBe('a8-h1');
    });

    it('returns correct diagonals for d5', () => {
      const result = getDiagonals('d5');
      // file - rank = 3-4 = -1, starts at a2, ends at g8
      expect(result.diagonal).toBe('a2-g8');
      // file + rank = 3+4 = 7, full anti-diagonal a8-h1
      expect(result.antiDiagonal).toBe('a8-h1');
    });

    it('returns correct diagonals for d4 (center)', () => {
      const result = getDiagonals('d4');
      // file - rank = 3-3 = 0, main diagonal a1-h8
      expect(result.diagonal).toBe('a1-h8');
      // file + rank = 3+3 = 6, a7-g1
      expect(result.antiDiagonal).toBe('a7-g1');
    });

    it('returns correct diagonals for e5 (center)', () => {
      const result = getDiagonals('e5');
      // file - rank = 4-4 = 0, main diagonal a1-h8
      expect(result.diagonal).toBe('a1-h8');
      // file + rank = 4+4 = 8, starts at h2(antiStartF=7, antiStartR=1), ends at b8(antiEndF=1, antiEndR=7)
      expect(result.antiDiagonal).toBe('b8-h2');
    });
  });

  describe('endpoints are left-to-right ordered', () => {
    it('diagonal endpoints always have lower file first', () => {
      const result = getDiagonals('c3');
      // file - rank = 2-2 = 0, a1-h8
      expect(result.diagonal).toBe('a1-h8');
      // The first square in the range should have a lower file letter
      const diagMatch = result.diagonal.match(/^([a-h])/);
      const diagEndMatch = result.diagonal.match(/-([a-h])/);
      if (diagMatch && diagEndMatch) {
        expect(diagMatch[1].charCodeAt(0)).toBeLessThan(diagEndMatch[1].charCodeAt(0));
      }
    });

    it('anti-diagonal endpoints always have lower file first', () => {
      const result = getDiagonals('e4');
      // anti-diagonal: a8-h1
      const antiMatch = result.antiDiagonal.match(/^([a-h])/);
      const antiEndMatch = result.antiDiagonal.match(/-([a-h])/);
      if (antiMatch && antiEndMatch) {
        expect(antiMatch[1].charCodeAt(0)).toBeLessThan(antiEndMatch[1].charCodeAt(0));
      }
    });
  });

  describe('all 64 squares produce valid outputs', () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    for (const file of files) {
      for (const rank of ranks) {
        const square = `${file}${rank}`;
        it(`produces valid output for ${square}`, () => {
          const result = getDiagonals(square);
          expect(result).toHaveProperty('diagonal');
          expect(result).toHaveProperty('antiDiagonal');

          // Each diagonal should be a single square or a range
          expect(result.diagonal).toMatch(/^[a-h][1-8](-[a-h][1-8])?$/);
          expect(result.antiDiagonal).toMatch(/^[a-h][1-8](-[a-h][1-8])?$/);
        });
      }
    }
  });

  describe('invalid input', () => {
    it('throws for invalid square notation', () => {
      expect(() => getDiagonals('i1')).toThrow('Invalid square: i1');
      expect(() => getDiagonals('a9')).toThrow('Invalid square: a9');
      expect(() => getDiagonals('a0')).toThrow('Invalid square: a0');
      expect(() => getDiagonals('')).toThrow('Invalid square: ');
      expect(() => getDiagonals('abc')).toThrow('Invalid square: abc');
    });
  });
});

describe('normalizeDiagonal', () => {
  describe('already normalized input', () => {
    it('returns as-is when already left-to-right', () => {
      expect(normalizeDiagonal('b1-h7')).toBe('b1-h7');
    });

    it('returns as-is for single square', () => {
      expect(normalizeDiagonal('a1')).toBe('a1');
    });
  });

  describe('reversed input', () => {
    it('normalizes reversed endpoints to left-to-right', () => {
      expect(normalizeDiagonal('h7-b1')).toBe('b1-h7');
    });

    it('normalizes h8-a1 to a1-h8', () => {
      expect(normalizeDiagonal('h8-a1')).toBe('a1-h8');
    });
  });

  describe('case insensitivity', () => {
    it('converts uppercase to lowercase', () => {
      expect(normalizeDiagonal('B1-H7')).toBe('b1-h7');
    });

    it('handles mixed case', () => {
      expect(normalizeDiagonal('b1-H7')).toBe('b1-h7');
    });

    it('handles uppercase single square', () => {
      expect(normalizeDiagonal('A1')).toBe('a1');
    });
  });

  describe('whitespace handling', () => {
    it('trims leading and trailing whitespace', () => {
      expect(normalizeDiagonal('  b1-h7  ')).toBe('b1-h7');
    });

    it('trims single square with whitespace', () => {
      expect(normalizeDiagonal(' a1 ')).toBe('a1');
    });
  });

  describe('same file endpoints', () => {
    it('sorts by rank when files are the same', () => {
      // This is an unusual case since diagonals never have same file endpoints,
      // but the function handles it
      expect(normalizeDiagonal('a5-a1')).toBe('a1-a5');
    });
  });

  describe('invalid format passthrough', () => {
    it('returns the trimmed lowercase input for unrecognized formats', () => {
      expect(normalizeDiagonal('invalid')).toBe('invalid');
      expect(normalizeDiagonal('a1-')).toBe('a1-');
    });
  });
});

describe('isValidDiagonalAnswer', () => {
  describe('valid answers', () => {
    it('accepts a range of two squares', () => {
      expect(isValidDiagonalAnswer('a1-h8')).toBe(true);
    });

    it('accepts another valid range', () => {
      expect(isValidDiagonalAnswer('b1-h7')).toBe(true);
    });

    it('accepts a single square', () => {
      expect(isValidDiagonalAnswer('a1')).toBe(true);
    });

    it('accepts single square h8', () => {
      expect(isValidDiagonalAnswer('h8')).toBe(true);
    });

    it('accepts uppercase input', () => {
      expect(isValidDiagonalAnswer('A1-H8')).toBe(true);
    });

    it('accepts input with whitespace', () => {
      expect(isValidDiagonalAnswer('  a1-h8  ')).toBe(true);
    });

    it('accepts all file-rank combinations for single squares', () => {
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
      for (const f of files) {
        for (const r of ranks) {
          expect(isValidDiagonalAnswer(`${f}${r}`)).toBe(true);
        }
      }
    });
  });

  describe('invalid answers', () => {
    it('rejects empty string', () => {
      expect(isValidDiagonalAnswer('')).toBe(false);
    });

    it('rejects trailing hyphen', () => {
      expect(isValidDiagonalAnswer('a1-')).toBe(false);
    });

    it('rejects leading hyphen', () => {
      expect(isValidDiagonalAnswer('-h8')).toBe(false);
    });

    it('rejects invalid rank (9)', () => {
      expect(isValidDiagonalAnswer('a9-h8')).toBe(false);
    });

    it('rejects invalid file (i)', () => {
      expect(isValidDiagonalAnswer('i1-h8')).toBe(false);
    });

    it('rejects random text', () => {
      expect(isValidDiagonalAnswer('abc')).toBe(false);
    });

    it('rejects three squares', () => {
      expect(isValidDiagonalAnswer('a1-b2-c3')).toBe(false);
    });

    it('rejects whitespace only', () => {
      expect(isValidDiagonalAnswer('   ')).toBe(false);
    });

    it('rejects rank 0', () => {
      expect(isValidDiagonalAnswer('a0')).toBe(false);
    });

    it('rejects numeric-only input', () => {
      expect(isValidDiagonalAnswer('11')).toBe(false);
    });
  });
});

describe('generateSquareSequence', () => {
  describe('returns correct count', () => {
    it('returns empty array for count 0', () => {
      expect(generateSquareSequence(0)).toHaveLength(0);
    });

    it('returns 1 square for count 1', () => {
      expect(generateSquareSequence(1)).toHaveLength(1);
    });

    it('returns 10 squares for count 10', () => {
      expect(generateSquareSequence(10)).toHaveLength(10);
    });

    it('returns 64 squares for count 64', () => {
      expect(generateSquareSequence(64)).toHaveLength(64);
    });
  });

  describe('all squares are valid chess squares', () => {
    it('every generated square matches [a-h][1-8]', () => {
      const squares = generateSquareSequence(20);
      for (const sq of squares) {
        expect(sq).toMatch(/^[a-h][1-8]$/);
      }
    });
  });

  describe('uniqueness within a batch', () => {
    it('generates unique squares when count is under 32', () => {
      const squares = generateSquareSequence(20);
      const uniqueSet = new Set(squares);
      expect(uniqueSet.size).toBe(20);
    });
  });

  describe('handles count larger than 32 (resets used squares)', () => {
    it('returns 50 squares when requested', () => {
      const squares = generateSquareSequence(50);
      expect(squares).toHaveLength(50);
      for (const sq of squares) {
        expect(sq).toMatch(/^[a-h][1-8]$/);
      }
    });
  });
});
