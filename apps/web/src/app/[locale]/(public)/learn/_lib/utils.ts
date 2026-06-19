/**
 * Utility functions for learn section
 */
import { createContentManager } from '@/app/[locale]/(public)/_lib/content-manager';
import type { PracticeModuleId } from '@/app/[locale]/_lib/practice-modules';
import type { Locale } from '@/app/[locale]/_lib/types';

import { contentRegistry, metadataRegistry } from './content-registry';
import type { Article, ArticleCategory, ArticleMetadata, ArticleSlug } from './types';
import { ARTICLE_CATEGORIES, ARTICLE_PRACTICE_MAPPING } from './types';

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
 * Return the locales for which a given learn article has both metadata and
 * content loaders registered — i.e. the locales whose
 * `/learn/<category>/<slug>` URL should appear in hreflang alternates and the
 * sitemap. Used by the article page metadata and the sitemap builder.
 */
export function getLearnArticleAvailableLocales(slug: string): Locale[] {
  return learnContentManager.getAvailableLocales(slug);
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
