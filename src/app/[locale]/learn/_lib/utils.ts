/**
 * Utility functions for learn section
 */
import type { PracticeModuleId } from '@/app/[locale]/_lib/practice-modules';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { Article, ArticleMetadata, ArticleSlug } from './types';
import { ARTICLE_ICONS, ARTICLE_PRACTICE_MAPPING } from './types';

const contentRegistry: Record<string, Record<Locale, () => Promise<string>>> = {
  'algebraic-notation': {
    en: () => import('../_content/algebraic-notation/en').then((m) => m.default),
    ja: () => import('../_content/algebraic-notation/ja').then((m) => m.default),
  },
  'bishop-movement': {
    en: () => import('../_content/bishop-movement/en').then((m) => m.default),
    ja: () => import('../_content/bishop-movement/ja').then((m) => m.default),
  },
  'fen-notation': {
    en: () => import('../_content/fen-notation/en').then((m) => m.default),
    ja: () => import('../_content/fen-notation/ja').then((m) => m.default),
  },
  'king-movement': {
    en: () => import('../_content/king-movement/en').then((m) => m.default),
    ja: () => import('../_content/king-movement/ja').then((m) => m.default),
  },
  'knight-movement': {
    en: () => import('../_content/knight-movement/en').then((m) => m.default),
    ja: () => import('../_content/knight-movement/ja').then((m) => m.default),
  },
  'knight-tour': {
    en: () => import('../_content/knight-tour/en').then((m) => m.default),
    ja: () => import('../_content/knight-tour/ja').then((m) => m.default),
  },
  'position-memory': {
    en: () => import('../_content/position-memory/en').then((m) => m.default),
    ja: () => import('../_content/position-memory/ja').then((m) => m.default),
  },
  'rook-movement': {
    en: () => import('../_content/rook-movement/en').then((m) => m.default),
    ja: () => import('../_content/rook-movement/ja').then((m) => m.default),
  },
  'square-colors': {
    en: () => import('../_content/square-colors/en').then((m) => m.default),
    ja: () => import('../_content/square-colors/ja').then((m) => m.default),
  },
};

// Static article registry by locale
const articleRegistry = {
  'algebraic-notation': {
    en: () => import('../_content/algebraic-notation/metadata.en'),
    ja: () => import('../_content/algebraic-notation/metadata.ja'),
  },
  'bishop-movement': {
    en: () => import('../_content/bishop-movement/metadata.en'),
    ja: () => import('../_content/bishop-movement/metadata.ja'),
  },
  'fen-notation': {
    en: () => import('../_content/fen-notation/metadata.en'),
    ja: () => import('../_content/fen-notation/metadata.ja'),
  },
  'king-movement': {
    en: () => import('../_content/king-movement/metadata.en'),
    ja: () => import('../_content/king-movement/metadata.ja'),
  },
  'knight-movement': {
    en: () => import('../_content/knight-movement/metadata.en'),
    ja: () => import('../_content/knight-movement/metadata.ja'),
  },
  'knight-tour': {
    en: () => import('../_content/knight-tour/metadata.en'),
    ja: () => import('../_content/knight-tour/metadata.ja'),
  },
  'position-memory': {
    en: () => import('../_content/position-memory/metadata.en'),
    ja: () => import('../_content/position-memory/metadata.ja'),
  },
  'rook-movement': {
    en: () => import('../_content/rook-movement/metadata.en'),
    ja: () => import('../_content/rook-movement/metadata.ja'),
  },
  'square-colors': {
    en: () => import('../_content/square-colors/metadata.en'),
    ja: () => import('../_content/square-colors/metadata.ja'),
  },
} as const;

/**
 * Get list of available article slugs
 */
export function getAvailableArticles(): string[] {
  return Object.keys(articleRegistry);
}

/**
 * Get a single article with its content
 * @param slug - Article slug
 * @param locale - Locale
 * @returns Article or null if not found
 */
export async function getArticle(slug: string, locale: Locale): Promise<Article | null> {
  try {
    if (!(slug in articleRegistry)) {
      return null;
    }

    // Import metadata using registry with locale
    const articleData = articleRegistry[slug as keyof typeof articleRegistry];
    if (!(locale in articleData)) {
      return null;
    }

    const metadataModule = await articleData[locale as keyof typeof articleData]();
    const metadata = metadataModule.metadata;

    // Import markdown content
    if (!(slug in contentRegistry) || !(locale in contentRegistry[slug])) {
      return null;
    }

    const content = await contentRegistry[slug][locale]();

    return {
      metadata,
      content,
    };
  } catch (error) {
    console.error(`Error loading article ${slug}:`, error);
    return null;
  }
}

/**
 * Get all articles metadata for a given locale
 * @param locale - Locale
 * @returns Sorted array of article metadata
 */
export async function getAllArticles(locale: Locale): Promise<ArticleMetadata[]> {
  const slugs = getAvailableArticles();
  const articles: ArticleMetadata[] = [];

  for (const slug of slugs) {
    try {
      const articleData = articleRegistry[slug as keyof typeof articleRegistry];
      if (locale in articleData) {
        const metadataModule = await articleData[locale as keyof typeof articleData]();
        articles.push(metadataModule.metadata);
      }
    } catch (error) {
      console.error(`Error loading metadata for ${slug}:`, error);
    }
  }

  // Sort by custom order first, then by published date (newest first)
  return articles.sort((a, b) => {
    // If both have order, sort by order (ascending)
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // If only one has order, prioritize it
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    // If neither has order, sort by published date (newest first)
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

/**
 * Get icon for an article
 * @param slug - The article slug
 * @returns Emoji icon string
 */
export function getArticleIcon(slug: ArticleSlug): string {
  return ARTICLE_ICONS[slug];
}

/**
 * Get recommended practice modules for an article
 * @param articleSlug - The article slug
 * @returns Array of practice module IDs, or undefined if no mapping exists
 */
export function getPracticeModulesForArticle(
  articleSlug: ArticleSlug
): PracticeModuleId[] | undefined {
  return ARTICLE_PRACTICE_MAPPING[articleSlug];
}
