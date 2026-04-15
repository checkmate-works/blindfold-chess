import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';
import * as Sentry from '@sentry/nextjs';

import { ARTICLE_CATEGORIES } from '@/app/[locale]/(public)/learn/_lib/types';
import { getAllArticles } from '@/app/[locale]/(public)/learn/_lib/utils';
import { getAllManualArticles } from '@/app/[locale]/(public)/manual/_lib/utils';

import { BASE_URL, generateAlternates } from './shared';

export async function buildLearnArticleEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of SUPPORTED_LOCALES) {
    try {
      const articles = await getAllArticles(locale);
      for (const article of articles) {
        if (article.category) {
          const path = `/learn/${article.category}/${article.slug}`;
          entries.push({
            url: `${BASE_URL}/${locale}${path}`,
            lastModified: new Date(article.publishedAt),
            alternates: generateAlternates(path),
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching learn articles for locale ${locale}:`, error);
      Sentry.captureException(error);
    }
  }

  // Learn category pages
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

  for (const locale of SUPPORTED_LOCALES) {
    try {
      const sections = await getAllManualArticles(locale);
      for (const section of sections) {
        const path = `/manual/${section.slug}`;
        entries.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: now,
          alternates: generateAlternates(path),
        });
      }
    } catch (error) {
      console.error(`Error fetching manual sections for locale ${locale}:`, error);
      Sentry.captureException(error);
    }
  }

  return entries;
}
