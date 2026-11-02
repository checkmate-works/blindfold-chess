import { describe, expect, it } from 'vitest';

import { isValidSquare } from './squares';

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
