import { MetadataRoute } from 'next';

import { SITE_URL, SUPPORTED_LOCALES } from '@/config';

import { getCategoryCounts, getUniqueLetters } from './[locale]/(public)/glossary/_lib/queries';
import { ARTICLE_CATEGORIES } from './[locale]/(public)/learn/_lib/types';
import { getAllArticles } from './[locale]/(public)/learn/_lib/utils';
import { getAllManualArticles } from './[locale]/(public)/manual/_lib/utils';
import { getCategories, getPublishedPosts } from './[locale]/(public)/posts/_lib/queries';

// Remove trailing slash from BASE_URL if present to avoid double slashes
const BASE_URL = SITE_URL.replace(/\/$/, '');

/**
 * Generate alternates object for hreflang cross-references.
 * Each locale variant gets a link to all other locale variants,
 * enabling Google to understand the language relationship.
 */
function generateAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    languages[locale] = `${BASE_URL}/${locale}${path}`;
  }
  // x-default points to the English version
  languages['x-default'] = `${BASE_URL}/en${path}`;
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const sitemap: MetadataRoute.Sitemap = [];

  // Add root URL without locale
  sitemap.push({
    url: BASE_URL,
    lastModified: now,
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
    '/practice/board-symmetry',
    '/practice/diagonal-quiz',
    '/practice/route-planner',
    '/practice/quadrants',
    '/getting-started',
    '/posts',
    '/games/new',
    '/games/new/standard',
    '/games/new/pgn',
    '/games/new/position',
    '/games/play',
  ];

  // Add static pages for each locale with hreflang alternates
  for (const locale of SUPPORTED_LOCALES) {
    for (const page of staticPages) {
      sitemap.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: now,
        alternates: generateAlternates(page),
      });
    }
  }

  // Dynamic pages - Learn articles
  for (const locale of SUPPORTED_LOCALES) {
    try {
      const articles = await getAllArticles(locale);
      for (const article of articles) {
        if (article.category) {
          const path = `/learn/${article.category}/${article.slug}`;
          sitemap.push({
            url: `${BASE_URL}/${locale}${path}`,
            lastModified: new Date(article.publishedAt),
            alternates: generateAlternates(path),
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
      const path = `/learn/${category}`;
      sitemap.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }
  }

  // Dynamic pages - Manual sections
  for (const locale of SUPPORTED_LOCALES) {
    try {
      const sections = await getAllManualArticles(locale);
      for (const section of sections) {
        const path = `/manual/${section.slug}`;
        sitemap.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: now,
          alternates: generateAlternates(path),
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
      const path = `/glossary/letter/${letter}`;
      sitemap.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }

    // Glossary category pages
    for (const category of glossaryCategories) {
      const path = `/glossary/category/${category}`;
      sitemap.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }
  }

  // Dynamic pages - Posts
  try {
    const [postCategories, publishedPosts] = await Promise.all([
      getCategories(),
      getPublishedPosts(),
    ]);

    for (const locale of SUPPORTED_LOCALES) {
      // Post category pages
      for (const category of postCategories) {
        const path = `/posts/${category.slug}`;
        sitemap.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: now,
          alternates: generateAlternates(path),
        });
      }

      // Individual post pages
      for (const post of publishedPosts) {
        const path = `/posts/${post.category.slug}/${post.slug}`;
        sitemap.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: post.updatedAt ?? post.publishedAt ?? now,
          alternates: generateAlternates(path),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching posts for sitemap:', error);
  }

  return sitemap;
}
