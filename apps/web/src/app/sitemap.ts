import { MetadataRoute } from 'next';

import { SITE_URL, SUPPORTED_LOCALES } from '@/config';

import { getCategoryCounts, getUniqueLetters } from './[locale]/glossary/_lib/queries';
import { ARTICLE_CATEGORIES } from './[locale]/learn/_lib/types';
import { getAllArticles } from './[locale]/learn/_lib/utils';
import { getAllManualArticles } from './[locale]/manual/_lib/utils';

// Remove trailing slash from BASE_URL if present to avoid double slashes
const BASE_URL = SITE_URL.replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemap: MetadataRoute.Sitemap = [];

  // Add root URL without locale
  sitemap.push({
    url: BASE_URL,
  });

  // Static pages for each locale
  const staticPages = [
    '', // Home
    '/privacy',
    '/terms',
    '/company',
    '/contact',
    '/preferences',
    '/faq',
    '/glossary',
    '/manual',
    '/learn',
    '/practice',
    '/practice/algebraic-notation',
    '/practice/coordinate-quiz',
    '/practice/square-colors',
    '/practice/legal-moves',
    '/practice/position-memory',
    '/practice/fen',
    '/practice/knight-tour',
    '/practice/move-sequence',
    '/game/new',
    '/play',
  ];

  // Add static pages for each locale
  for (const locale of SUPPORTED_LOCALES) {
    for (const page of staticPages) {
      sitemap.push({
        url: `${BASE_URL}/${locale}${page}`,
      });
    }
  }

  // Dynamic pages - Learn articles
  for (const locale of SUPPORTED_LOCALES) {
    try {
      const articles = await getAllArticles(locale);
      for (const article of articles) {
        if (article.category) {
          sitemap.push({
            url: `${BASE_URL}/${locale}/learn/${article.category}/${article.slug}`,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching learn articles for locale ${locale}:`, error);
    }
  }

  // Dynamic pages - Learn category pages
  const learnCategories = Object.values(ARTICLE_CATEGORIES);
  for (const locale of SUPPORTED_LOCALES) {
    for (const category of learnCategories) {
      sitemap.push({
        url: `${BASE_URL}/${locale}/learn/${category}`,
      });
    }
  }

  // Dynamic pages - Manual sections
  for (const locale of SUPPORTED_LOCALES) {
    try {
      const sections = await getAllManualArticles(locale);
      for (const section of sections) {
        sitemap.push({
          url: `${BASE_URL}/${locale}/manual/${section.slug}`,
        });
      }
    } catch (error) {
      console.error(`Error fetching manual sections for locale ${locale}:`, error);
    }
  }

  // Dynamic pages - Glossary letters and categories
  const glossaryLetters = await getUniqueLetters();
  const categoryCounts = await getCategoryCounts();
  const glossaryCategories = Object.keys(categoryCounts);

  for (const locale of SUPPORTED_LOCALES) {
    // Glossary letter pages
    for (const letter of glossaryLetters) {
      sitemap.push({
        url: `${BASE_URL}/${locale}/glossary/letter/${letter}`,
      });
    }

    // Glossary category pages
    for (const category of glossaryCategories) {
      sitemap.push({
        url: `${BASE_URL}/${locale}/glossary/category/${category}`,
      });
    }
  }

  return sitemap;
}
