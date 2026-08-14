import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';

import { ARTICLE_CATEGORIES } from '@/app/[locale]/(public)/learn/_lib/types';
import {
  getAllArticles,
  getLearnArticleAvailableLocales,
} from '@/app/[locale]/(public)/learn/_lib/utils';
import {
  getAllManualArticles,
  getManualArticleAvailableLocales,
} from '@/app/[locale]/(public)/manual/_lib/utils';

import { BASE_URL, buildSitemapSection, generateAlternates } from './shared';

export async function buildLearnArticleEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // One section per locale, not one for the whole loop: a locale whose
  // articles fail to load must not cost the others their entries.
  for (const locale of SUPPORTED_LOCALES) {
    const localeEntries = await buildSitemapSection(
      `Error fetching learn articles for locale ${locale}`,
      async () => {
        const articles = await getAllArticles(locale);
        return articles.flatMap((article) => {
          if (!article.category) return [];
          const path = `/learn/${article.category}/${article.slug}`;
          return [
            {
              url: `${BASE_URL}/${locale}${path}`,
              lastModified: new Date(article.publishedAt),
              alternates: generateAlternates(path, getLearnArticleAvailableLocales(article.slug)),
            },
          ];
        });
      }
    );
    entries.push(...localeEntries);
  }

  // Learn category pages — category landing pages are translated for every
  // supported locale via next-intl messages, so they emit the full set of
  // alternates (default behavior of `generateAlternates`).
  const learnCategories = Object.values(ARTICLE_CATEGORIES);
  for (const locale of SUPPORTED_LOCALES) {
    for (const category of learnCategories) {
      const path = `/learn/${category}`;
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }
  }

  return entries;
}

export async function buildManualSectionEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Per-locale sections, for the same reason as buildLearnArticleEntries.
  for (const locale of SUPPORTED_LOCALES) {
    const localeEntries = await buildSitemapSection(
      `Error fetching manual sections for locale ${locale}`,
      async () =>
        (await getAllManualArticles(locale)).map((section) => {
          const path = `/manual/${section.slug}`;
          return {
            url: `${BASE_URL}/${locale}${path}`,
            lastModified: now,
            alternates: generateAlternates(path, getManualArticleAvailableLocales(section.slug)),
          };
        })
    );
    entries.push(...localeEntries);
  }

  return entries;
}
