import { and, count, desc, eq, isNotNull, sql } from 'drizzle-orm';

import { type Article, articles, db } from '@/lib/db';

// NOTE: Currently articles have a flat structure without categories.
// If categories are needed in the future, add an `article_categories` table,
// update routes (e.g., /articles/[category]/[slug]), and set up 301 redirects
// from the current /articles/[slug] URLs.

const pinnedFirstOrdering = [sql`${articles.pinnedAt} DESC NULLS LAST`, desc(articles.publishedAt)];

export async function getPublishedArticles(locale: string): Promise<Article[]> {
  return db
    .select()
    .from(articles)
    .where(and(eq(articles.status, 'published'), eq(articles.locale, locale)))
    .orderBy(...pinnedFirstOrdering);
}

export async function getLatestPublishedArticles(
  locale: string,
  limit: number
): Promise<Article[]> {
  return db
    .select()
    .from(articles)
    .where(and(eq(articles.status, 'published'), eq(articles.locale, locale)))
    .orderBy(...pinnedFirstOrdering)
    .limit(limit);
}

export async function getPublishedArticleCount(locale: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(articles)
    .where(and(eq(articles.status, 'published'), eq(articles.locale, locale)));

  return result.count;
}

export async function getPublishedArticlesPaginated(
  locale: string,
  limit: number,
  offset: number
): Promise<Article[]> {
  return db
    .select()
    .from(articles)
    .where(and(eq(articles.status, 'published'), eq(articles.locale, locale)))
    .orderBy(...pinnedFirstOrdering)
    .limit(limit)
    .offset(offset);
}

export async function getPublishedArticle(slug: string, locale: string): Promise<Article | null> {
  const results = await db
    .select()
    .from(articles)
    .where(
      and(eq(articles.slug, slug), eq(articles.locale, locale), eq(articles.status, 'published'))
    )
    .limit(1);

  return results[0] || null;
}

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
