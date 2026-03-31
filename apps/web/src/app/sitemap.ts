import { MetadataRoute } from 'next';

import { SITE_URL, SUPPORTED_LOCALES } from '@/config';
import enMessages from '@/messages/en.json';
import { and, eq, isNull } from 'drizzle-orm';

import { db, topicPosts } from '@/lib/db';
import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';

import { getPublishedAnnouncements } from './[locale]/(public)/announcements/_lib/queries';
import { getPublishedArticlesForSitemap } from './[locale]/(public)/articles/_lib/queries';
import { getCategoryCounts, getUniqueLetters } from './[locale]/(public)/glossary/_lib/queries';
import { ARTICLE_CATEGORIES } from './[locale]/(public)/learn/_lib/types';
import { getAllArticles } from './[locale]/(public)/learn/_lib/utils';
import { getAllManualArticles } from './[locale]/(public)/manual/_lib/utils';
import { INTERVIEW_QUESTION_KEYS } from './[locale]/_lib/interview';

const BASE_URL = SITE_URL;

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
    '/articles',
    '/announcements',
    '/leaderboard',
    '/ranks',
    '/pricing',
    '/affiliate-disclosure',
    '/topics',
    '/topics/openings',
    '/topics/squares',
    '/interview',
    '/games',
    '/games/new',
    '/games/new/standard',
    '/games/new/pgn',
    '/games/new/position',
    '/games/new/opening',
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
      const path = `/glossary/letter/${letter.toLowerCase()}`;
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

  // Dynamic pages - Articles
  try {
    const publishedArticles = await getPublishedArticlesForSitemap();

    for (const article of publishedArticles) {
      const path = `/articles/${article.slug}`;
      sitemap.push({
        url: `${BASE_URL}/${article.locale}${path}`,
        lastModified: article.updatedAt ?? article.publishedAt ?? now,
        alternates: generateAlternates(path),
      });
    }
  } catch (error) {
    console.error('Error fetching articles for sitemap:', error);
  }

  // Dynamic pages - Announcements
  try {
    const allAnnouncements = await getPublishedAnnouncements();
    const seenSlugs = new Set<string>();

    for (const announcement of allAnnouncements) {
      if (seenSlugs.has(announcement.slug)) continue;
      seenSlugs.add(announcement.slug);

      const path = `/announcements/${announcement.slug}`;
      for (const locale of SUPPORTED_LOCALES) {
        sitemap.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: announcement.publishedAt ?? now,
          alternates: generateAlternates(path),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching announcements for sitemap:', error);
  }

  // Dynamic pages - Ranks
  for (const slug of ALL_RANK_SLUGS) {
    const path = `/ranks/${slug}`;
    for (const locale of SUPPORTED_LOCALES) {
      sitemap.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }
  }

  // Dynamic pages - Rank guide pages
  const guidePages = enMessages.ranks.detail.guidePages as Record<string, unknown[]>;
  for (const [slug, pages] of Object.entries(guidePages)) {
    for (let page = 1; page <= pages.length; page++) {
      const path = page === 1 ? `/ranks/${slug}/guide` : `/ranks/${slug}/guide/${page}`;
      for (const locale of SUPPORTED_LOCALES) {
        sitemap.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: now,
          alternates: generateAlternates(path),
        });
      }
    }
  }

  // Dynamic pages - Topics (openings with posts)
  try {
    const openingTopics = await db
      .selectDistinct({ topicKey: topicPosts.topicKey })
      .from(topicPosts)
      .where(
        and(
          eq(topicPosts.topicType, 'opening'),
          isNull(topicPosts.parentId),
          isNull(topicPosts.deletedAt)
        )
      );

    for (const { topicKey } of openingTopics) {
      const path = `/topics/openings/${topicKey}`;
      for (const locale of SUPPORTED_LOCALES) {
        sitemap.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: now,
          alternates: generateAlternates(path),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching opening topics for sitemap:', error);
  }

  // Dynamic pages - Topics (squares with posts)
  try {
    const squareTopics = await db
      .selectDistinct({ topicKey: topicPosts.topicKey })
      .from(topicPosts)
      .where(
        and(
          eq(topicPosts.topicType, 'square'),
          isNull(topicPosts.parentId),
          isNull(topicPosts.deletedAt)
        )
      );

    for (const { topicKey } of squareTopics) {
      const path = `/topics/squares/${topicKey}`;
      for (const locale of SUPPORTED_LOCALES) {
        sitemap.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: now,
          alternates: generateAlternates(path),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching square topics for sitemap:', error);
  }

  // Dynamic pages - Interview questions
  for (const key of INTERVIEW_QUESTION_KEYS) {
    const path = `/interview/${key}`;
    for (const locale of SUPPORTED_LOCALES) {
      sitemap.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }
  }

  return sitemap;
}
