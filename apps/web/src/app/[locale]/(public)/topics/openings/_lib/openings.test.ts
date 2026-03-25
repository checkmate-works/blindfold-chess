import { describe, expect, it } from 'vitest';

import { isBlackOpening, isValidOpeningSlugFormat } from './openings';

describe('isValidOpeningSlugFormat', () => {
  describe('valid slugs', () => {
    it('should accept simple lowercase slugs', () => {
      expect(isValidOpeningSlugFormat('french-defense')).toBe(true);
      expect(isValidOpeningSlugFormat('ruy-lopez')).toBe(true);
      expect(isValidOpeningSlugFormat('kings-gambit')).toBe(true);
    });

    it('should accept slugs with multiple hyphens', () => {
      expect(isValidOpeningSlugFormat('kings-indian-defense')).toBe(true);
      expect(isValidOpeningSlugFormat('queens-gambit-declined')).toBe(true);
      expect(isValidOpeningSlugFormat('semi-slav-defense')).toBe(true);
    });

    it('should accept single word slugs (no hyphens)', () => {
      expect(isValidOpeningSlugFormat('sicilian')).toBe(true);
      expect(isValidOpeningSlugFormat('catalan')).toBe(true);
    });

    it('should accept slugs with numbers', () => {
      expect(isValidOpeningSlugFormat('e4')).toBe(true);
      expect(isValidOpeningSlugFormat('d4-opening')).toBe(true);
      expect(isValidOpeningSlugFormat('4-knights-game')).toBe(true);
    });

    it('should accept single character slugs', () => {
      expect(isValidOpeningSlugFormat('a')).toBe(true);
      expect(isValidOpeningSlugFormat('1')).toBe(true);
    });

    it('should accept slugs at max length (100 characters)', () => {
      const slug = 'a'.repeat(100);
      expect(isValidOpeningSlugFormat(slug)).toBe(true);
    });
  });

  describe('invalid slugs', () => {
    it('should reject empty string', () => {
      expect(isValidOpeningSlugFormat('')).toBe(false);
    });

    it('should reject strings with uppercase letters', () => {
      expect(isValidOpeningSlugFormat('French-Defense')).toBe(false);
      expect(isValidOpeningSlugFormat('FRENCH')).toBe(false);
      expect(isValidOpeningSlugFormat('frencH')).toBe(false);
    });

    it('should reject strings with spaces', () => {
      expect(isValidOpeningSlugFormat('french defense')).toBe(false);
      expect(isValidOpeningSlugFormat(' french')).toBe(false);
      expect(isValidOpeningSlugFormat('french ')).toBe(false);
    });

    it('should reject strings with special characters', () => {
      expect(isValidOpeningSlugFormat('french_defense')).toBe(false);
      expect(isValidOpeningSlugFormat('french.defense')).toBe(false);
      expect(isValidOpeningSlugFormat('french/defense')).toBe(false);
      expect(isValidOpeningSlugFormat("king's-gambit")).toBe(false);
      expect(isValidOpeningSlugFormat('french@defense')).toBe(false);
    });

    it('should reject leading hyphens', () => {
      expect(isValidOpeningSlugFormat('-french')).toBe(false);
      expect(isValidOpeningSlugFormat('-french-defense')).toBe(false);
    });

    it('should reject trailing hyphens', () => {
      expect(isValidOpeningSlugFormat('french-')).toBe(false);
      expect(isValidOpeningSlugFormat('french-defense-')).toBe(false);
    });

    it('should reject consecutive hyphens', () => {
      expect(isValidOpeningSlugFormat('french--defense')).toBe(false);
      expect(isValidOpeningSlugFormat('a---b')).toBe(false);
    });

    it('should reject slugs exceeding 100 characters', () => {
      const slug = 'a'.repeat(101);
      expect(isValidOpeningSlugFormat(slug)).toBe(false);
    });

    it('should reject very long slugs', () => {
      const slug = 'a'.repeat(200);
      expect(isValidOpeningSlugFormat(slug)).toBe(false);
    });

    it('should reject hyphen-only strings', () => {
      expect(isValidOpeningSlugFormat('-')).toBe(false);
      expect(isValidOpeningSlugFormat('--')).toBe(false);
    });
  });
});

// ============================================================
// isBlackOpening
// ============================================================
describe('isBlackOpening', () => {
  describe('white openings (black to move in FEN)', () => {
    it('should return false for the standard starting position (white to move)', () => {
      // Standard starting FEN — it's white's turn, meaning no one has moved yet,
      // so this is NOT a black opening
      expect(isBlackOpening('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(true);
    });

    it('should return false after 1.e4 e5 (white to move)', () => {
      // After 1.e4 e5, it's white's turn — black moved last, so this IS a black opening
      expect(isBlackOpening('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2')).toBe(
        true
      );
    });
  });

  describe('black openings (white to move in FEN)', () => {
    it('should return true after 1.e4 (black to move)', () => {
      // After 1.e4, it's black's turn — white moved last, so this is a white opening
      expect(isBlackOpening('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe(
        false
      );
    });

    it('should return true after 1.e4 e5 2.Nf3 (black to move)', () => {
      // After 1.e4 e5 2.Nf3, it's black's turn — white opening
      expect(isBlackOpening('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2')).toBe(
        false
      );
    });
  });

  describe('real opening positions', () => {
    it('should identify Sicilian Defense as a white opening (black to move after 1.e4 c5)', () => {
      // After 1.e4 c5 2.Nf3, it's black's turn — this is a white opening
      expect(isBlackOpening('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2')).toBe(
        false
      );
    });

    it('should identify a position after even number of moves as a black opening', () => {
      // After 1.e4 e5 (white to move) — black's opening position
      expect(isBlackOpening('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2')).toBe(
        true
      );
    });
  });

  describe('edge cases', () => {
    it('should handle FEN with minimal fields', () => {
      // FEN with only placement and active color
      expect(isBlackOpening('8/8/8/8/8/8/8/8 w - - 0 1')).toBe(true);
      expect(isBlackOpening('8/8/8/8/8/8/8/8 b - - 0 1')).toBe(false);
    });

    it('should handle FEN without extra spaces', () => {
      expect(isBlackOpening('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(true);
    });
  });
});
