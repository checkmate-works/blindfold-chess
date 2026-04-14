import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildPageTitle, generateCanonicalMetadata, resolveTitle } from './metadata';

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
        es: 'https://www.blindfold-chess.online/es/learn',
        ja: 'https://www.blindfold-chess.online/ja/learn',
        pt: 'https://www.blindfold-chess.online/pt/learn',
        'x-default': 'https://www.blindfold-chess.online/en/learn',
      });
    });

    it('should generate alternate URLs for root path', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '',
      });

      expect(result.alternates?.languages).toEqual({
        en: 'https://www.blindfold-chess.online/en',
        es: 'https://www.blindfold-chess.online/es',
        ja: 'https://www.blindfold-chess.online/ja',
        pt: 'https://www.blindfold-chess.online/pt',
        'x-default': 'https://www.blindfold-chess.online/en',
      });
    });

    it('should generate alternate URLs regardless of current locale', () => {
      const result = generateCanonicalMetadata({
        locale: 'ja',
        path: '/practice/algebraic-notation',
      });

      expect(result.alternates?.languages).toEqual({
        en: 'https://www.blindfold-chess.online/en/practice/algebraic-notation',
        es: 'https://www.blindfold-chess.online/es/practice/algebraic-notation',
        ja: 'https://www.blindfold-chess.online/ja/practice/algebraic-notation',
        pt: 'https://www.blindfold-chess.online/pt/practice/algebraic-notation',
        'x-default': 'https://www.blindfold-chess.online/en/practice/algebraic-notation',
      });
    });

    it('should set x-default to the default locale (en) version URL', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/practice/knight-tour',
      });

      expect(result.alternates?.languages?.['x-default']).toBe(
        'https://www.blindfold-chess.online/en/practice/knight-tour'
      );
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

  describe('openGraph title with suffix logic', () => {
    it('should apply buildPageTitle to openGraph title when title is provided', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/learn',
        title: 'Learn Chess',
      });

      expect(result.openGraph?.title).toBe('Learn Chess | Blindfold Chess');
    });

    it('should use brand name suffix when title contains seoSiteName (EN)', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '',
        title: 'Blindfold Chess Training - Free Online Practice',
      });

      expect(result.openGraph?.title).toBe(
        'Blindfold Chess Training - Free Online Practice | Shingan Chess'
      );
    });

    it('should use brand name suffix when title contains seoSiteName (JA)', () => {
      const result = generateCanonicalMetadata({
        locale: 'ja',
        path: '',
        title: '目隠しチェストレーニング - 無料オンライン練習',
      });

      expect(result.openGraph?.title).toBe(
        '目隠しチェストレーニング - 無料オンライン練習 | 心眼チェス'
      );
    });

    it('should not include openGraph title when title is not provided', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/learn',
      });

      expect(result.openGraph?.title).toBeUndefined();
    });

    it('should use brand name suffix for JA locale when title contains seoSiteName', () => {
      const result = generateCanonicalMetadata({
        locale: 'ja',
        path: '/learn',
        title: '目隠しチェスの練習',
      });

      expect(result.openGraph?.title).toBe('目隠しチェスの練習 | 心眼チェス');
    });

    it('should use seoSiteName suffix for JA locale when title does not contain seoSiteName', () => {
      const result = generateCanonicalMetadata({
        locale: 'ja',
        path: '/learn',
        title: 'チェスを学ぶ',
      });

      expect(result.openGraph?.title).toBe('チェスを学ぶ | 目隠しチェス');
    });

    it('should include description in openGraph when provided', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/learn',
        title: 'Learn Chess',
        description: 'A guide to learning chess.',
      });

      expect(result.openGraph?.description).toBe('A guide to learning chess.');
    });

    it('should handle empty string title by not including openGraph title', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: '/learn',
        title: '',
      });

      // Empty string is falsy, so openGraph title should not be set
      expect(result.openGraph?.title).toBeUndefined();
    });
  });

  describe('availableLocales and canonicalLocale overrides', () => {
    it('should restrict hreflang to provided availableLocales', () => {
      const result = generateCanonicalMetadata({
        locale: 'es',
        path: 'articles/test',
        availableLocales: ['en', 'ja'],
      });
      // hreflang should only have en, ja, x-default (NOT es)
      expect(result.alternates?.languages).toEqual({
        en: 'https://www.blindfold-chess.online/en/articles/test',
        ja: 'https://www.blindfold-chess.online/ja/articles/test',
        'x-default': 'https://www.blindfold-chess.online/en/articles/test',
      });
    });

    it('should override canonical URL locale when canonicalLocale is provided', () => {
      const result = generateCanonicalMetadata({
        locale: 'es',
        path: 'articles/test',
        canonicalLocale: 'en',
      });
      expect(result.alternates?.canonical).toBe(
        'https://www.blindfold-chess.online/en/articles/test'
      );
    });

    it('should use canonicalLocale for openGraph URL', () => {
      const result = generateCanonicalMetadata({
        locale: 'es',
        path: 'articles/test',
        canonicalLocale: 'en',
        title: 'Test Article',
      });
      expect(result.openGraph?.url).toBe('https://www.blindfold-chess.online/en/articles/test');
    });

    it('should include all SUPPORTED_LOCALES when availableLocales is not provided', () => {
      const result = generateCanonicalMetadata({
        locale: 'en',
        path: 'articles/test',
      });
      expect(result.alternates?.languages).toHaveProperty('en');
      expect(result.alternates?.languages).toHaveProperty('es');
      expect(result.alternates?.languages).toHaveProperty('ja');
      expect(result.alternates?.languages).toHaveProperty('x-default');
    });

    it('should use effectiveLocale for openGraph title suffix', () => {
      const result = generateCanonicalMetadata({
        locale: 'es',
        path: 'articles/test',
        canonicalLocale: 'ja',
        title: '目隠しチェスの練習',
      });
      // Should use ja locale for buildPageTitle since canonicalLocale is ja
      expect(result.openGraph?.title).toBe('目隠しチェスの練習 | 心眼チェス');
    });
  });
});

describe('buildPageTitle', () => {
  describe('English locale', () => {
    it('should append seoSiteName when title does not contain it', () => {
      expect(buildPageTitle('Learn Chess', 'en')).toBe('Learn Chess | Blindfold Chess');
    });

    it('should append siteName when title contains seoSiteName', () => {
      expect(buildPageTitle('Blindfold Chess Training - Free Online Practice', 'en')).toBe(
        'Blindfold Chess Training - Free Online Practice | Shingan Chess'
      );
    });

    it('should detect seoSiteName as a substring', () => {
      expect(buildPageTitle('Learn Blindfold Chess Techniques', 'en')).toBe(
        'Learn Blindfold Chess Techniques | Shingan Chess'
      );
    });
  });

  describe('Japanese locale', () => {
    it('should append seoSiteName when title does not contain it', () => {
      expect(buildPageTitle('チェスを学ぶ', 'ja')).toBe('チェスを学ぶ | 目隠しチェス');
    });

    it('should append siteName when title contains seoSiteName', () => {
      expect(buildPageTitle('目隠しチェストレーニング', 'ja')).toBe(
        '目隠しチェストレーニング | 心眼チェス'
      );
    });
  });

  describe('unknown locale fallback', () => {
    it('should fall back to English site names for unknown locale', () => {
      expect(buildPageTitle('Learn Chess', 'fr')).toBe('Learn Chess | Blindfold Chess');
    });

    it('should use brand suffix when unknown locale title contains English seoSiteName', () => {
      expect(buildPageTitle('Blindfold Chess Guide', 'fr')).toBe(
        'Blindfold Chess Guide | Shingan Chess'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty string title', () => {
      expect(buildPageTitle('', 'en')).toBe(' | Blindfold Chess');
    });

    it('should handle title that is exactly the seoSiteName (EN)', () => {
      expect(buildPageTitle('Blindfold Chess', 'en')).toBe('Blindfold Chess | Shingan Chess');
    });

    it('should handle title that is exactly the seoSiteName (JA)', () => {
      expect(buildPageTitle('目隠しチェス', 'ja')).toBe('目隠しチェス | 心眼チェス');
    });

    it('should handle title containing seoSiteName multiple times', () => {
      expect(buildPageTitle('Blindfold Chess vs Blindfold Chess Training', 'en')).toBe(
        'Blindfold Chess vs Blindfold Chess Training | Shingan Chess'
      );
    });

    it('should handle title where seoSiteName appears at the very end', () => {
      expect(buildPageTitle('Learn Blindfold Chess', 'en')).toBe(
        'Learn Blindfold Chess | Shingan Chess'
      );
    });

    it('should handle title where seoSiteName appears at the very beginning', () => {
      expect(buildPageTitle('Blindfold Chess Training', 'en')).toBe(
        'Blindfold Chess Training | Shingan Chess'
      );
    });

    it('should not match partial keyword "Blindfold" alone', () => {
      expect(buildPageTitle('Blindfold Training', 'en')).toBe(
        'Blindfold Training | Blindfold Chess'
      );
    });

    it('should not match partial keyword "Chess" alone', () => {
      expect(buildPageTitle('Chess Tactics', 'en')).toBe('Chess Tactics | Blindfold Chess');
    });
  });
});

describe('resolveTitle', () => {
  describe('English locale', () => {
    it('should return plain string when title does not contain seoSiteName', () => {
      const result = resolveTitle('Learn Chess', 'en');
      expect(result).toBe('Learn Chess');
    });

    it('should return absolute object when title contains seoSiteName', () => {
      const result = resolveTitle('Blindfold Chess Training - Free Online Practice', 'en');
      expect(result).toEqual({
        absolute: 'Blindfold Chess Training - Free Online Practice | Shingan Chess',
      });
    });
  });

  describe('Japanese locale', () => {
    it('should return plain string when title does not contain seoSiteName', () => {
      const result = resolveTitle('チェスを学ぶ', 'ja');
      expect(result).toBe('チェスを学ぶ');
    });

    it('should return absolute object when title contains seoSiteName', () => {
      const result = resolveTitle('目隠しチェストレーニング', 'ja');
      expect(result).toEqual({
        absolute: '目隠しチェストレーニング | 心眼チェス',
      });
    });
  });

  describe('return type contract', () => {
    it('should return string type for non-matching titles', () => {
      const result = resolveTitle('Practice', 'en');
      expect(typeof result).toBe('string');
    });

    it('should return object type for matching titles', () => {
      const result = resolveTitle('Blindfold Chess Guide', 'en');
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('absolute');
    });
  });

  describe('edge cases', () => {
    it('should return plain string for empty title', () => {
      const result = resolveTitle('', 'en');
      expect(result).toBe('');
    });

    it('should return absolute object when title is exactly seoSiteName', () => {
      const result = resolveTitle('Blindfold Chess', 'en');
      expect(result).toEqual({ absolute: 'Blindfold Chess | Shingan Chess' });
    });

    it('should fall back to English detection for unknown locale', () => {
      const result = resolveTitle('Blindfold Chess Guide', 'fr');
      expect(result).toEqual({ absolute: 'Blindfold Chess Guide | Shingan Chess' });
    });

    it('should return plain string for unknown locale with non-matching title', () => {
      const result = resolveTitle('Some Page', 'fr');
      expect(result).toBe('Some Page');
    });

    it('should return absolute object for JA title with seoSiteName at end', () => {
      const result = resolveTitle('無料目隠しチェス', 'ja');
      expect(result).toEqual({ absolute: '無料目隠しチェス | 心眼チェス' });
    });
  });
});
