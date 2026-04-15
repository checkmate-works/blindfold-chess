import type { MetadataRoute } from 'next';

import * as Sentry from '@sentry/nextjs';

import { getPublishedArticlesForSitemap } from '@/app/[locale]/(public)/articles/_lib/queries';

import { BASE_URL, generateAlternates } from './shared';

export async function buildArticleEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    const publishedArticles = await getPublishedArticlesForSitemap();

    for (const article of publishedArticles) {
      const path = `/articles/${article.slug}`;
      entries.push({
        url: `${BASE_URL}/${article.locale}${path}`,
        lastModified: article.updatedAt ?? article.publishedAt ?? now,
        alternates: generateAlternates(path),
      });
    }
  } catch (error) {
    console.error('Error fetching articles for sitemap:', error);
    Sentry.captureException(error);
  }

  return entries;
}
