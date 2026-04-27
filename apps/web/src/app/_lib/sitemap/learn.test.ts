import { SITE_URL, SUPPORTED_LOCALES } from '@/config';
import { describe, expect, it } from 'vitest';

import { MANUAL_ARTICLE_SLUGS } from '@/app/[locale]/(public)/manual/_lib/types';

import { buildManualSectionEntries } from './learn';

/**
 * The top-level `app/sitemap.test.ts` mocks `getAllManualArticles` to `[]` so
 * it never exercises the manual block. This file does the opposite: it runs
 * `buildManualSectionEntries` against the real manual content registry to
 * confirm that every supported locale (including pt-BR) appears in both the
 * row URLs and the hreflang alternates.
 *
 * This is the regression guard for the original "/pt-BR/manual is empty" bug
 * at the sitemap layer — if a future locale lacks loaders, the sitemap should
 * not silently drop the row.
 */
describe('buildManualSectionEntries — sitemap manual block', () => {
  const allSlugs = Object.values(MANUAL_ARTICLE_SLUGS);

  it('emits one entry per (locale, slug) pair', async () => {
    const entries = await buildManualSectionEntries(new Date());
    const expectedCount = SUPPORTED_LOCALES.length * allSlugs.length;
    expect(entries).toHaveLength(expectedCount);
  });

  it('emits the /<locale>/manual/<slug> URL for every locale × slug', async () => {
    const entries = await buildManualSectionEntries(new Date());
    const urls = new Set(entries.map((e) => e.url));
    for (const locale of SUPPORTED_LOCALES) {
      for (const slug of allSlugs) {
        expect(urls).toContain(`${SITE_URL}/${locale}/manual/${slug}`);
      }
    }
  });

  it('every entry exposes hreflang alternates for every supported locale plus x-default', async () => {
    const entries = await buildManualSectionEntries(new Date());
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.alternates).toBeDefined();
      const languages = entry.alternates!.languages!;
      for (const locale of SUPPORTED_LOCALES) {
        expect(
          languages[locale],
          `Entry ${entry.url} is missing hreflang alternate for ${locale}`
        ).toBeDefined();
      }
      expect(languages['x-default']).toBeDefined();
    }
  });

  it('hreflang alternates point at /<locale>/manual/<slug> with the matching locale segment', async () => {
    const entries = await buildManualSectionEntries(new Date());
    for (const entry of entries) {
      const languages = entry.alternates!.languages!;
      for (const locale of SUPPORTED_LOCALES) {
        const value = languages[locale];
        expect(value).toMatch(new RegExp(`/${locale}/manual/`));
      }
    }
  });
});
