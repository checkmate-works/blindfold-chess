import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';

import { type Article, articles, db } from '@/lib/db';

// NOTE: Currently articles have a flat structure without categories.
// If categories are needed in the future, add an `article_categories` table,
// update routes (e.g., /articles/[category]/[slug]), and set up 301 redirects
// from the current /articles/[slug] URLs.

const DEFAULT_LOCALE = 'en';

const pinnedFirstOrdering = [sql`${articles.pinnedAt} DESC NULLS LAST`, desc(articles.publishedAt)];

/**
 * Pick the best locale variant from a group of articles sharing the same slug.
 * Priority: requested locale > default locale (en) > first available.
 */
function pickByLocale(rows: Article[], locale: string): Article {
  return (
    rows.find((a) => a.locale === locale) ??
    rows.find((a) => a.locale === DEFAULT_LOCALE) ??
    rows[0]
  );
}

/**
 * Deduplicate articles by slug, keeping the best locale variant for each.
 * Preserves the original ordering of the first occurrence of each slug.
 */
function deduplicateBySlug(rows: Article[], locale: string): Article[] {
  const grouped = new Map<string, Article[]>();
  for (const row of rows) {
    const group = grouped.get(row.slug);
    if (group) {
      group.push(row);
    } else {
      grouped.set(row.slug, [row]);
    }
  }

  return [...grouped.values()].map((group) => pickByLocale(group, locale));
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
 */
export async function getLatestPublishedArticles(
  locale: string,
  limit: number
): Promise<Article[]> {
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.status, 'published'), isNotNull(articles.publishedAt)))
    .orderBy(...pinnedFirstOrdering);

  return deduplicateBySlug(rows, locale).slice(0, limit);
}

/**
 * Count published articles deduplicated by slug.
 */
export async function getPublishedArticleCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${articles.slug})` })
    .from(articles)
    .where(and(eq(articles.status, 'published'), isNotNull(articles.publishedAt)));

  return Number(result.count);
}

/**
 * Get paginated articles for the listing page, deduplicated by slug.
 * Each slug appears once, preferring the requested locale version.
 */
export async function getPublishedArticlesPaginated(
  locale: string,
  limit: number,
  offset: number
): Promise<Article[]> {
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.status, 'published'), isNotNull(articles.publishedAt)))
    .orderBy(...pinnedFirstOrdering);

  return deduplicateBySlug(rows, locale).slice(offset, offset + limit);
}

/**
 * Get a single published article by slug.
 * Fetches all locale variants for the slug and picks the best match:
 *   1. Requested locale
 *   2. Default locale (en)
 *   3. Any available locale
 */
export async function getPublishedArticle(slug: string, locale: string): Promise<Article | null> {
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

  return pickByLocale(results, locale);
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
