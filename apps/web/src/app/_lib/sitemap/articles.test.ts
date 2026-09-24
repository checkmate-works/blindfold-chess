import { SITE_URL } from '@/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildArticleEntries } from './articles';

type SitemapRow = {
  slug: string;
  locale: string;
  updatedAt: Date;
  publishedAt: Date | null;
};

const rows = vi.hoisted(() => ({ current: [] as SitemapRow[] }));

vi.mock('@/app/[locale]/(public)/articles/_lib/queries', () => ({
  getPublishedArticlesForSitemap: () => Promise.resolve(rows.current),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: () => undefined,
}));

describe('buildArticleEntries — lastModified', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  beforeEach(() => {
    rows.current = [];
  });

  const lastModifiedFor = async (row: SitemapRow) => {
    rows.current = [row];
    const entries = await buildArticleEntries(now);
    const entry = entries.find((e) => e.url === `${SITE_URL}/${row.locale}/articles/${row.slug}`);
    return entry?.lastModified;
  };

  it('uses updatedAt when it postdates publishedAt', async () => {
    const updatedAt = new Date('2024-03-01T09:00:00Z');
    expect(
      await lastModifiedFor({
        slug: 'edited',
        locale: 'en',
        updatedAt,
        publishedAt: new Date('2024-01-20T14:30:00Z'),
      })
    ).toEqual(updatedAt);
  });

  it('uses publishedAt when updatedAt predates it', async () => {
    const publishedAt = new Date('2024-01-20T14:30:00Z');
    expect(
      await lastModifiedFor({
        slug: 'saved-before-its-publication-date',
        locale: 'ja',
        updatedAt: new Date('2024-01-19T00:00:00Z'),
        publishedAt,
      })
    ).toEqual(publishedAt);
  });

  it('uses updatedAt when publishedAt is null', async () => {
    const updatedAt = new Date('2024-03-01T09:00:00Z');
    expect(
      await lastModifiedFor({ slug: 'undated', locale: 'en', updatedAt, publishedAt: null })
    ).toEqual(updatedAt);
  });
});
