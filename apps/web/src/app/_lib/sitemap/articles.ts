import type { MetadataRoute } from 'next';

import { getPublishedArticlesForSitemap } from '@/app/[locale]/(public)/articles/_lib/queries';

import { BASE_URL, buildSitemapSection, generateAlternates } from './shared';

export async function buildArticleEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  return buildSitemapSection('Error fetching articles for sitemap', async () => {
    const entries: MetadataRoute.Sitemap = [];
    const publishedArticles = await getPublishedArticlesForSitemap();

    // Group rows by slug so each entry can emit hreflang alternates only for
    // the locales that actually have a published article row. Without this,
    // a partially-translated article would claim alternates in locales whose
    // URL returns the fallback locale's content, breaking the bidirectional
    // hreflang contract described in `generateCanonicalMetadata`.
    const localesBySlug = new Map<string, string[]>();
    for (const article of publishedArticles) {
      const locales = localesBySlug.get(article.slug);
      if (locales) {
        locales.push(article.locale);
      } else {
        localesBySlug.set(article.slug, [article.locale]);
      }
    }

    for (const article of publishedArticles) {
      const path = `/articles/${article.slug}`;
      const availableLocales = localesBySlug.get(article.slug) ?? [article.locale];
      entries.push({
        url: `${BASE_URL}/${article.locale}${path}`,
        lastModified: article.updatedAt ?? article.publishedAt ?? now,
        alternates: generateAlternates(path, availableLocales),
      });
    }
    return entries;
  });
}
