import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateCanonicalMetadata } from './metadata';

describe('generateCanonicalMetadata', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.blindfold-chess.online';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  describe('canonical URL generation', () => {
    it('should generate canonical URL for root path with en locale', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '',
      });

      expect(result.alternates?.canonical).toBe('https://www.blindfold-chess.online/en');
    });

    it('should generate canonical URL for root path with ja locale', () => {
      const result = generateCanonicalMetadata({
        locale: 'ja',
        path: '',
      });

      expect(result.alternates?.canonical).toBe('https://www.blindfold-chess.online/ja');
    });

    it('should generate canonical URL for nested path', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/practice/algebraic-notation',
      });

      expect(result.alternates?.canonical).toBe(
        'https://www.blindfold-chess.online/en/practice/algebraic-notation'
      );
    });

    it('should handle path without leading slash', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: 'learn',
      });

      expect(result.alternates?.canonical).toBe('https://www.blindfold-chess.online/en/learn');
    });

    it('should handle SITE_URL with trailing slash', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://www.blindfold-chess.online/';

      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/practice',
      });

      expect(result.alternates?.canonical).toBe('https://www.blindfold-chess.online/en/practice');
    });
  });

  describe('alternate languages generation', () => {
    it('should generate correct alternate URLs for both locales', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/learn',
      });

      expect(result.alternates?.languages).toEqual({
        en: 'https://www.blindfold-chess.online/en/learn',
        ja: 'https://www.blindfold-chess.online/ja/learn',
      });
    });

    it('should generate alternate URLs for root path', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '',
      });

      expect(result.alternates?.languages).toEqual({
        en: 'https://www.blindfold-chess.online/en',
        ja: 'https://www.blindfold-chess.online/ja',
      });
    });

    it('should generate alternate URLs regardless of current locale', () => {
      const result = generateCanonicalMetadata({
        locale: 'ja',
        path: '/practice/algebraic-notation',
      });

      expect(result.alternates?.languages).toEqual({
        en: 'https://www.blindfold-chess.online/en/practice/algebraic-notation',
        ja: 'https://www.blindfold-chess.online/ja/practice/algebraic-notation',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty path correctly', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '',
      });

      expect(result.alternates?.canonical).toBe('https://www.blindfold-chess.online/en');
      expect(result.alternates?.languages?.en).toBe('https://www.blindfold-chess.online/en');
    });

    it('should handle path with multiple slashes', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/practice/game/start',
      });

      expect(result.alternates?.canonical).toBe(
        'https://www.blindfold-chess.online/en/practice/game/start'
      );
    });

    it('should not add double slashes in URLs', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/learn',
      });

      expect(result.alternates?.canonical).not.toContain('//learn');
      expect(result.alternates?.languages?.en).not.toContain('//learn');
    });
  });
});
