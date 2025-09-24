import { MetadataRoute } from 'next';
import { getAllArticles } from './[locale]/learn/_lib/learn';
import { getAllManualArticles } from './[locale]/manual/_lib/manual';
import { chessTerms } from './[locale]/glossary/_data/chess-terms';

// Remove trailing slash from BASE_URL if present to avoid double slashes
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://blindfold-chess.com').replace(
  /\/$/,
  ''
);
const LOCALES = ['en', 'ja'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemap: MetadataRoute.Sitemap = [];

  // Static pages for each locale
  const staticPages = [
    '', // Home
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
    '/game/new',
    '/play',
  ];

  // Add static pages for each locale
  for (const locale of LOCALES) {
    for (const page of staticPages) {
      sitemap.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '' ? 1.0 : 0.8,
      });
    }
  }

  // Dynamic pages - Learn articles
  for (const locale of LOCALES) {
    try {
      const articles = await getAllArticles(locale);
      for (const article of articles) {
        sitemap.push({
          url: `${BASE_URL}/${locale}/learn/${article.slug}`,
          lastModified: new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    } catch (error) {
      console.error(`Error fetching learn articles for locale ${locale}:`, error);
    }
  }

  // Dynamic pages - Manual sections
  for (const locale of LOCALES) {
    try {
      const sections = await getAllManualArticles(locale);
      for (const section of sections) {
        sitemap.push({
          url: `${BASE_URL}/${locale}/manual/${section.slug}`,
          lastModified: new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    } catch (error) {
      console.error(`Error fetching manual sections for locale ${locale}:`, error);
    }
  }

  // Dynamic pages - Glossary letters and categories
  const uniqueLetters = new Set<string>();
  const uniqueCategories = new Set<string>();

  chessTerms.forEach((term) => {
    uniqueLetters.add(term.term[0].toUpperCase());
    if (term.category) {
      uniqueCategories.add(term.category);
    }
  });

  for (const locale of LOCALES) {
    // Glossary letter pages
    uniqueLetters.forEach((letter) => {
      sitemap.push({
        url: `${BASE_URL}/${locale}/glossary/letter/${letter}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    });

    // Glossary category pages
    uniqueCategories.forEach((category) => {
      sitemap.push({
        url: `${BASE_URL}/${locale}/glossary/category/${category}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    });
  }

  return sitemap;
}
