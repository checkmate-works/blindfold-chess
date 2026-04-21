import { SUPPORTED_LOCALES } from '@/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildRootEntry } from './static-pages';

/**
 * buildRootEntry emits the landing hreflang cluster — one entry per
 * supported locale, at `/` for en and `/?lang=<code>` for the rest. The
 * `alternates.languages` map is reciprocal across every entry so search
 * engines see a consistent graph.
 *
 * This suite guards the contract; a mismatch here would ship as a real
 * "alternate page with wrong hreflang" warning in Search Console.
 */
describe('buildRootEntry (landing hreflang cluster)', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;
  const now = new Date('2026-04-22T00:00:00.000Z');

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.blindfold-chess.online';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  it('emits one entry per supported locale', () => {
    const entries = buildRootEntry(now);
    expect(entries).toHaveLength(SUPPORTED_LOCALES.length);
  });

  it('maps en to bare / and other locales to /?lang=<code>', () => {
    const entries = buildRootEntry(now);
    const urls = entries.map((e) => e.url).sort();
    expect(urls).toEqual(
      [
        'https://www.blindfold-chess.online/',
        'https://www.blindfold-chess.online/?lang=es',
        'https://www.blindfold-chess.online/?lang=ja',
        'https://www.blindfold-chess.online/?lang=pt-BR',
      ].sort()
    );
  });

  it('gives every entry the same reciprocal languages map (hreflang graph consistency)', () => {
    const entries = buildRootEntry(now);
    const first = entries[0].alternates?.languages;
    expect(first).toBeDefined();
    for (const entry of entries) {
      expect(entry.alternates?.languages).toEqual(first);
    }
  });

  it('each entry lists every supported locale plus x-default', () => {
    const entries = buildRootEntry(now);
    const expected = [...SUPPORTED_LOCALES, 'x-default'].sort();
    for (const entry of entries) {
      const keys = Object.keys(entry.alternates?.languages ?? {}).sort();
      expect(keys).toEqual(expected);
    }
  });

  it('x-default points at the bare / URL (the en default)', () => {
    const entries = buildRootEntry(now);
    for (const entry of entries) {
      expect(entry.alternates?.languages?.['x-default']).toBe(
        'https://www.blindfold-chess.online/'
      );
    }
  });

  it('lastModified is propagated to every entry', () => {
    const entries = buildRootEntry(now);
    for (const entry of entries) {
      expect(entry.lastModified).toBe(now);
    }
  });
});
