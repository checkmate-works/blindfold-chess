import { describe, expect, it } from 'vitest';

import { isValidOpeningSlugFormat } from './openings';

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
