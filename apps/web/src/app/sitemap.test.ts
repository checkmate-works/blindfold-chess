import { SITE_URL, SUPPORTED_LOCALES } from '@/config';
import enMessages from '@/messages/en.json';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

import sitemapFn from './sitemap';

// Mock every DB / query module that `sitemap.ts` touches so we don't require a
// running database. The guides block is fully i18n-driven and needs no mocks.
vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    selectDistinct: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
  },
}));

vi.mock('./[locale]/(public)/announcements/_lib/queries', () => ({
  getPublishedAnnouncements: () => Promise.resolve([]),
}));

vi.mock('./[locale]/(public)/articles/_lib/queries', () => ({
  getPublishedArticlesForSitemap: () => Promise.resolve([]),
}));

vi.mock('./[locale]/(public)/glossary/_lib/queries', () => ({
  getCategoryCounts: () => Promise.resolve({}),
  getUniqueLetters: () => Promise.resolve([]),
}));

vi.mock('./[locale]/(public)/learn/_lib/utils', () => ({
  getAllArticles: () => Promise.resolve([]),
}));

vi.mock('./[locale]/(public)/manual/_lib/utils', () => ({
  getAllManualArticles: () => Promise.resolve([]),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: () => undefined,
}));

type SitemapEntry = Awaited<ReturnType<typeof sitemapFn>>[number];

describe('sitemap — guides block', () => {
  let entries: SitemapEntry[];
  beforeAll(async () => {
    entries = await sitemapFn();
  });

  const urls = () => entries.map((e) => e.url);

  it('emits the /guides hub top for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(urls()).toContain(`${SITE_URL}/${locale}/dojo/guides`);
    }
  });

  it('emits /dojo/guides/[rank] for every rank with guide content in every locale', () => {
    const rankSlugsWithGuides = Object.keys(enMessages.guides.pages);
    for (const locale of SUPPORTED_LOCALES) {
      for (const slug of rankSlugsWithGuides) {
        expect(urls()).toContain(`${SITE_URL}/${locale}/dojo/guides/${slug}`);
      }
    }
  });

  it('does NOT emit guide entries for ranks without content (1dan)', () => {
    const ranksWithoutGuides = ['1dan'];
    for (const locale of SUPPORTED_LOCALES) {
      for (const slug of ranksWithoutGuides) {
        expect(urls()).not.toContain(`${SITE_URL}/${locale}/dojo/guides/${slug}`);
      }
    }
  });

  it('emits flat page 2..N entries matching the real i18n page counts', () => {
    const guides = enMessages.guides.pages as Record<
      string,
      { format: string; pages?: unknown[]; chapters?: unknown[] }
    >;
    for (const [slug, guide] of Object.entries(guides)) {
      if (guide.format !== 'flat' || !guide.pages) continue;
      for (let page = 2; page <= guide.pages.length; page++) {
        for (const locale of SUPPORTED_LOCALES) {
          expect(urls()).toContain(`${SITE_URL}/${locale}/dojo/guides/${slug}/${page}`);
        }
      }
      // Sanity: page 1 should NOT appear as a separate entry (it's the rank root)
      for (const locale of SUPPORTED_LOCALES) {
        expect(urls()).not.toContain(`${SITE_URL}/${locale}/dojo/guides/${slug}/1`);
      }
    }
  });

  it('does NOT emit any legacy /ranks/:slug/guide entries', () => {
    for (const url of urls()) {
      expect(url).not.toMatch(/\/ranks\/[^/]+\/guide(?:\/|$)/);
    }
  });

  it('adds hreflang alternates to every guide entry', () => {
    const guideEntries = entries.filter((e) => e.url.includes('/guides'));
    expect(guideEntries.length).toBeGreaterThan(0);
    for (const entry of guideEntries) {
      expect(entry.alternates).toBeDefined();
      const languages = entry.alternates!.languages!;
      for (const locale of SUPPORTED_LOCALES) {
        expect(languages[locale]).toBeDefined();
      }
      expect(languages['x-default']).toBeDefined();
    }
  });

  it('each guide entry has a url and lastModified', () => {
    const guideEntries = entries.filter((e) => e.url.includes('/dojo/guides/'));
    for (const entry of guideEntries) {
      expect(typeof entry.url).toBe('string');
      expect(entry.url.length).toBeGreaterThan(0);
      expect(entry.lastModified).toBeDefined();
    }
  });
});
