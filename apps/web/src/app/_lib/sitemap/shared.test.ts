import { SUPPORTED_LOCALES } from '@/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateAlternates } from './shared';

/**
 * generateAlternates is the sitemap counterpart of generateCanonicalMetadata's
 * `alternates.languages` map. Both must emit the same set of locales so
 * Google sees consistent bidirectional hreflang across `<link rel="alternate"
 * hreflang>` tags and the XML sitemap. This suite guards the sitemap side of
 * that contract.
 */
describe('generateAlternates (sitemap hreflang)', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.blindfold-chess.online';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  it('emits one entry per SUPPORTED_LOCALES locale plus x-default', () => {
    const result = generateAlternates('/learn');

    const keys = Object.keys(result.languages).sort();
    const expected = [...SUPPORTED_LOCALES, 'x-default'].sort();
    expect(keys).toEqual(expected);
  });

  it('points x-default at the English version', () => {
    const result = generateAlternates('/learn');

    expect(result.languages['x-default']).toBe('https://www.blindfold-chess.online/en/learn');
  });

  it('builds locale-prefixed absolute URLs for every supported locale', () => {
    const result = generateAlternates('/learn');

    // Every locale must be covered — exhaustive iteration so adding a new
    // supported locale forces this test to stay in sync via SUPPORTED_LOCALES.
    for (const locale of SUPPORTED_LOCALES) {
      expect(result.languages[locale]).toBe(`https://www.blindfold-chess.online/${locale}/learn`);
    }
  });

  it('handles nested paths correctly', () => {
    const result = generateAlternates('/practice/algebraic-notation');

    expect(result.languages['en']).toBe(
      'https://www.blindfold-chess.online/en/practice/algebraic-notation'
    );
    expect(result.languages['pt-BR']).toBe(
      'https://www.blindfold-chess.online/pt-BR/practice/algebraic-notation'
    );
    expect(result.languages['x-default']).toBe(
      'https://www.blindfold-chess.online/en/practice/algebraic-notation'
    );
  });

  it('handles an empty path (produces URLs ending at the locale segment)', () => {
    const result = generateAlternates('');

    expect(result.languages['en']).toBe('https://www.blindfold-chess.online/en');
    expect(result.languages['pt-BR']).toBe('https://www.blindfold-chess.online/pt-BR');
    expect(result.languages['x-default']).toBe('https://www.blindfold-chess.online/en');
  });
});
