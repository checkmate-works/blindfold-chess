/**
 * Utility functions for learn section
 */
import { createContentManager } from '@/app/[locale]/(public)/_lib/content-manager';
import type { PracticeModuleId } from '@/app/[locale]/_lib/practice-modules';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { Article, ArticleCategory, ArticleMetadata, ArticleSlug } from './types';
import { ARTICLE_CATEGORIES, ARTICLE_PRACTICE_MAPPING } from './types';

const contentRegistry: Record<string, Record<Locale, () => Promise<string>>> = {
  'algebraic-notation': {
    en: () => import('../_content/algebraic-notation/en').then((m) => m.default),
    ja: () => import('../_content/algebraic-notation/ja').then((m) => m.default),
    es: () => import('../_content/algebraic-notation/es').then((m) => m.default),
  },
  'anchor-squares': {
    en: () => import('../_content/anchor-squares/en').then((m) => m.default),
    ja: () => import('../_content/anchor-squares/ja').then((m) => m.default),
    es: () => import('../_content/anchor-squares/es').then((m) => m.default),
  },
  'bishop-movement': {
    en: () => import('../_content/bishop-movement/en').then((m) => m.default),
    ja: () => import('../_content/bishop-movement/ja').then((m) => m.default),
    es: () => import('../_content/bishop-movement/es').then((m) => m.default),
  },
  'board-symmetry': {
    en: () => import('../_content/board-symmetry/en').then((m) => m.default),
    ja: () => import('../_content/board-symmetry/ja').then((m) => m.default),
    es: () => import('../_content/board-symmetry/es').then((m) => m.default),
  },
  'coordinate-confusion': {
    en: () => import('../_content/coordinate-confusion/en').then((m) => m.default),
    ja: () => import('../_content/coordinate-confusion/ja').then((m) => m.default),
    es: () => import('../_content/coordinate-confusion/es').then((m) => m.default),
  },
  'de-groot-experiment': {
    en: () => import('../_content/de-groot-experiment/en').then((m) => m.default),
    ja: () => import('../_content/de-groot-experiment/ja').then((m) => m.default),
    es: () => import('../_content/de-groot-experiment/es').then((m) => m.default),
  },
  diagonals: {
    en: () => import('../_content/diagonals/en').then((m) => m.default),
    ja: () => import('../_content/diagonals/ja').then((m) => m.default),
    es: () => import('../_content/diagonals/es').then((m) => m.default),
  },
  'fen-notation': {
    en: () => import('../_content/fen-notation/en').then((m) => m.default),
    ja: () => import('../_content/fen-notation/ja').then((m) => m.default),
    es: () => import('../_content/fen-notation/es').then((m) => m.default),
  },
  'king-movement': {
    en: () => import('../_content/king-movement/en').then((m) => m.default),
    ja: () => import('../_content/king-movement/ja').then((m) => m.default),
    es: () => import('../_content/king-movement/es').then((m) => m.default),
  },
  'knight-movement': {
    en: () => import('../_content/knight-movement/en').then((m) => m.default),
    ja: () => import('../_content/knight-movement/ja').then((m) => m.default),
    es: () => import('../_content/knight-movement/es').then((m) => m.default),
  },
  'knight-tour': {
    en: () => import('../_content/knight-tour/en').then((m) => m.default),
    ja: () => import('../_content/knight-tour/ja').then((m) => m.default),
    es: () => import('../_content/knight-tour/es').then((m) => m.default),
  },
  'position-memory': {
    en: () => import('../_content/position-memory/en').then((m) => m.default),
    ja: () => import('../_content/position-memory/ja').then((m) => m.default),
    es: () => import('../_content/position-memory/es').then((m) => m.default),
  },
  'rook-movement': {
    en: () => import('../_content/rook-movement/en').then((m) => m.default),
    ja: () => import('../_content/rook-movement/ja').then((m) => m.default),
    es: () => import('../_content/rook-movement/es').then((m) => m.default),
  },
  'square-colors': {
    en: () => import('../_content/square-colors/en').then((m) => m.default),
    ja: () => import('../_content/square-colors/ja').then((m) => m.default),
    es: () => import('../_content/square-colors/es').then((m) => m.default),
  },
};

// Static article registry by locale
const metadataRegistry = {
  'algebraic-notation': {
    en: () => import('../_content/algebraic-notation/metadata.en'),
    ja: () => import('../_content/algebraic-notation/metadata.ja'),
    es: () => import('../_content/algebraic-notation/metadata.es'),
  },
  'anchor-squares': {
    en: () => import('../_content/anchor-squares/metadata.en'),
    ja: () => import('../_content/anchor-squares/metadata.ja'),
    es: () => import('../_content/anchor-squares/metadata.es'),
  },
  'bishop-movement': {
    en: () => import('../_content/bishop-movement/metadata.en'),
    ja: () => import('../_content/bishop-movement/metadata.ja'),
    es: () => import('../_content/bishop-movement/metadata.es'),
  },
  'board-symmetry': {
    en: () => import('../_content/board-symmetry/metadata.en'),
    ja: () => import('../_content/board-symmetry/metadata.ja'),
    es: () => import('../_content/board-symmetry/metadata.es'),
  },
  'coordinate-confusion': {
    en: () => import('../_content/coordinate-confusion/metadata.en'),
    ja: () => import('../_content/coordinate-confusion/metadata.ja'),
    es: () => import('../_content/coordinate-confusion/metadata.es'),
  },
  'de-groot-experiment': {
    en: () => import('../_content/de-groot-experiment/metadata.en'),
    ja: () => import('../_content/de-groot-experiment/metadata.ja'),
    es: () => import('../_content/de-groot-experiment/metadata.es'),
  },
  diagonals: {
    en: () => import('../_content/diagonals/metadata.en'),
    ja: () => import('../_content/diagonals/metadata.ja'),
    es: () => import('../_content/diagonals/metadata.es'),
  },
  'fen-notation': {
    en: () => import('../_content/fen-notation/metadata.en'),
    ja: () => import('../_content/fen-notation/metadata.ja'),
    es: () => import('../_content/fen-notation/metadata.es'),
  },
  'king-movement': {
    en: () => import('../_content/king-movement/metadata.en'),
    ja: () => import('../_content/king-movement/metadata.ja'),
    es: () => import('../_content/king-movement/metadata.es'),
  },
  'knight-movement': {
    en: () => import('../_content/knight-movement/metadata.en'),
    ja: () => import('../_content/knight-movement/metadata.ja'),
    es: () => import('../_content/knight-movement/metadata.es'),
  },
  'knight-tour': {
    en: () => import('../_content/knight-tour/metadata.en'),
    ja: () => import('../_content/knight-tour/metadata.ja'),
    es: () => import('../_content/knight-tour/metadata.es'),
  },
  'position-memory': {
    en: () => import('../_content/position-memory/metadata.en'),
    ja: () => import('../_content/position-memory/metadata.ja'),
    es: () => import('../_content/position-memory/metadata.es'),
  },
  'rook-movement': {
    en: () => import('../_content/rook-movement/metadata.en'),
    ja: () => import('../_content/rook-movement/metadata.ja'),
    es: () => import('../_content/rook-movement/metadata.es'),
  },
  'square-colors': {
    en: () => import('../_content/square-colors/metadata.en'),
    ja: () => import('../_content/square-colors/metadata.ja'),
    es: () => import('../_content/square-colors/metadata.es'),
  },
} as const;

const learnContentManager = createContentManager<ArticleMetadata>({
  metadataRegistry,
  contentRegistry,
  sort: (a, b) => {
    // Sort by custom order first, then by published date (newest first)
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  },
});

/**
 * Get a single article with its content
 * @param slug - Article slug
 * @param locale - Locale
 * @returns Article or null if not found
 */
export async function getArticle(slug: string, locale: Locale): Promise<Article | null> {
  return learnContentManager.getArticle(slug, locale);
}

/**
 * Get all articles metadata for a given locale
 * @param locale - Locale
 * @returns Sorted array of article metadata
 */
export async function getAllArticles(locale: Locale): Promise<ArticleMetadata[]> {
  return learnContentManager.getAllArticles(locale);
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

/**
 * Get all available categories
 * @returns Array of category strings
 */
export function getAvailableCategories(): ArticleCategory[] {
  return Object.values(ARTICLE_CATEGORIES);
}

/**
 * Get articles filtered by category
 * @param category - The category to filter by
 * @param locale - Locale
 * @returns Array of article metadata matching the category
 */
export async function getArticlesByCategory(
  category: ArticleCategory,
  locale: Locale
): Promise<ArticleMetadata[]> {
  const allArticles = await getAllArticles(locale);
  return allArticles.filter((article) => article.category === category);
}

/**
 * Get count of articles per category
 * @param locale - Locale
 * @returns Record of category to count
 */
export async function getCategoryCounts(locale: Locale): Promise<Record<ArticleCategory, number>> {
  const allArticles = await getAllArticles(locale);
  const counts = {} as Record<ArticleCategory, number>;

  // Initialize all categories with 0
  for (const category of Object.values(ARTICLE_CATEGORIES)) {
    counts[category] = 0;
  }

  // Count articles per category
  for (const article of allArticles) {
    if (article.category) {
      counts[article.category]++;
    }
  }

  return counts;
}
