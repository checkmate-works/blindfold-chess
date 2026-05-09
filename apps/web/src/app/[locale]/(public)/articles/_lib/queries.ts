import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';

import { type Article, articles, db } from '@/lib/db';

import { DEFAULT_LOCALE, pickByLocale } from '@/app/[locale]/_lib/locale-utils';

// NOTE: Currently articles have a flat structure without categories.
// If categories are needed in the future, add an `article_categories` table,
// update routes (e.g., /articles/[category]/[slug]), and set up 301 redirects
// from the current /articles/[slug] URLs.

const pinnedFirstOrdering = [sql`${articles.pinnedAt} DESC NULLS LAST`, desc(articles.publishedAt)];

/**
 * Build a SQL query that deduplicates articles by slug, keeping the best
 * locale variant for each slug. Uses ROW_NUMBER() window function to rank
 * locale variants per slug by priority:
 *   1. Requested locale
 *   2. Default locale (en)
 *   3. Any other locale
 *
 * The result is ordered by pinned_at DESC NULLS LAST, published_at DESC,
 * then paginated with LIMIT/OFFSET applied after deduplication.
 */
async function getDeduplicatedArticles(
  locale: string,
  limit: number,
  offset: number
): Promise<Article[]> {
  const rows = await db.execute<Article>(sql`
    SELECT
      id,
      slug,
      title,
      excerpt,
      description,
      content,
      locale,
      status,
      category_id AS "categoryId",
      display_order AS "displayOrder",
      icon,
      pinned_at AS "pinnedAt",
      published_at AS "publishedAt",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY ${articles.slug}
          ORDER BY
            CASE ${articles.locale}
              WHEN ${locale} THEN 0
              WHEN ${DEFAULT_LOCALE} THEN 1
              ELSE 2
            END
        ) AS rn
      FROM ${articles}
      WHERE ${articles.status} = 'published'
        AND ${articles.publishedAt} IS NOT NULL
    ) ranked
    WHERE rn = 1
    ORDER BY pinned_at DESC NULLS LAST, published_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows;
}

/**
 * Get all published articles (used by generateStaticParams).
 * Does NOT deduplicate by slug — callers extract unique slugs themselves.
 */
export async function getPublishedArticles(): Promise<Article[]> {
  return db
    .select()
    .from(articles)
    .where(and(eq(articles.status, 'published'), isNotNull(articles.publishedAt)))
    .orderBy(...pinnedFirstOrdering);
}

/**
 * Get latest published articles for the home page, deduplicated by slug.
 * Each slug appears once, preferring the requested locale version.
 *
 * Uses SQL ROW_NUMBER() to deduplicate and paginate in the database,
 * avoiding fetching all articles into application memory.
 */
export const getLatestPublishedArticles = unstable_cache(
  async (locale: string, limit: number): Promise<Article[]> => {
    return getDeduplicatedArticles(locale, limit, 0);
  },
  ['latest-published-articles'],
  { tags: ['articles'], revalidate: 300 }
);

/**
 * Count published articles deduplicated by slug.
 */
export const getPublishedArticleCount = unstable_cache(
  async (): Promise<number> => {
    const [result] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${articles.slug})` })
      .from(articles)
      .where(and(eq(articles.status, 'published'), isNotNull(articles.publishedAt)));

    return Number(result.count);
  },
  ['published-article-count'],
  { tags: ['articles'], revalidate: 300 }
);

/**
 * Get paginated articles for the listing page, deduplicated by slug.
 * Each slug appears once, preferring the requested locale version.
 *
 * Uses SQL ROW_NUMBER() to deduplicate and paginate in the database,
 * avoiding fetching all articles into application memory.
 */
export async function getPublishedArticlesPaginated(
  locale: string,
  limit: number,
  offset: number
): Promise<Article[]> {
  return getDeduplicatedArticles(locale, limit, offset);
}

/**
 * Get a single published article by slug.
 * Fetches all locale variants for the slug and picks the best match:
 *   1. Requested locale
 *   2. Default locale (en)
 *   3. Any available locale
 */
export const getPublishedArticle = cache(
  async (
    slug: string,
    locale: string
  ): Promise<{ article: Article; availableLocales: string[] } | null> => {
    const results = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.slug, slug),
          eq(articles.status, 'published'),
          isNotNull(articles.publishedAt)
        )
      );

    if (results.length === 0) return null;

    const availableLocales = results.map((r) => r.locale);
    return { article: pickByLocale(results, locale), availableLocales };
  }
);

/**
 * Get all published articles for sitemap generation (all locales)
 */
export async function getPublishedArticlesForSitemap(): Promise<
  Pick<Article, 'slug' | 'locale' | 'updatedAt' | 'publishedAt'>[]
> {
  return db
    .select({
      slug: articles.slug,
      locale: articles.locale,
      updatedAt: articles.updatedAt,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(and(eq(articles.status, 'published'), isNotNull(articles.publishedAt)));
}
