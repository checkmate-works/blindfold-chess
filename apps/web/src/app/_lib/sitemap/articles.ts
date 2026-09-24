import type { MetadataRoute } from 'next';

import { getPublishedArticlesForSitemap } from '@/app/[locale]/(public)/articles/_lib/queries';

import { BASE_URL, buildSitemapSection, generateAlternates } from './shared';

/**
 * The later of `updatedAt` and `publishedAt`, so `<lastmod>` agrees with the
 * article page's BlogPosting JSON-LD (`generateBlogPostingSchema`), which omits
 * `dateModified` when `updatedAt` does not postdate `publishedAt` and so leaves
 * `datePublished` as the page's latest date.
 *
 * `updatedAt` alone can predate publication: `publishedAt` is a datetime typed
 * into the admin publish form, not the time of the save, so a save made before
 * the date it names leaves `updatedAt` behind it. A `<lastmod>` earlier than
 * the page's own publication date would be the same contradiction.
 *
 * Both come from the row this entry's URL renders — the sitemap lists only
 * locales that have their own row, never a locale-fallback URL.
 */
function lastModifiedOf(article: { updatedAt: Date | null; publishedAt: Date | null }) {
  const { updatedAt, publishedAt } = article;
  if (updatedAt && publishedAt) return updatedAt > publishedAt ? updatedAt : publishedAt;
  return updatedAt ?? publishedAt;
}

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
        lastModified: lastModifiedOf(article) ?? now,
        alternates: generateAlternates(path, availableLocales),
      });
    }
    return entries;
  });
}
