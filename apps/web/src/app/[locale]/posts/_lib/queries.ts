import { and, desc, eq, sql } from 'drizzle-orm';

import { type Category, type Post, categories, db, posts } from '@/lib/db';

export type PostWithCategory = Post & {
  category: Category;
};

const pinnedFirstOrdering = [sql`${posts.pinnedAt} DESC NULLS LAST`, desc(posts.publishedAt)];

/**
 * Get all published posts
 */
export async function getPublishedPosts(): Promise<PostWithCategory[]> {
  const results = await db
    .select({
      post: posts,
      category: categories,
    })
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.status, 'published'))
    .orderBy(...pinnedFirstOrdering);

  return results.map((r) => ({
    ...r.post,
    category: r.category,
  }));
}

/**
 * Get latest published posts with limit
 */
export async function getLatestPublishedPosts(limit: number): Promise<PostWithCategory[]> {
  const results = await db
    .select({
      post: posts,
      category: categories,
    })
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.status, 'published'))
    .orderBy(...pinnedFirstOrdering)
    .limit(limit);

  return results.map((r) => ({
    ...r.post,
    category: r.category,
  }));
}

/**
 * Get published posts by category slug
 */
export async function getPublishedPostsByCategory(
  categorySlug: string
): Promise<PostWithCategory[]> {
  const results = await db
    .select({
      post: posts,
      category: categories,
    })
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .where(and(eq(categories.slug, categorySlug), eq(posts.status, 'published')))
    .orderBy(...pinnedFirstOrdering);

  return results.map((r) => ({
    ...r.post,
    category: r.category,
  }));
}

/**
 * Get a single published post by category and slug
 */
export async function getPublishedPost(
  categorySlug: string,
  postSlug: string
): Promise<PostWithCategory | null> {
  const results = await db
    .select({
      post: posts,
      category: categories,
    })
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .where(
      and(
        eq(categories.slug, categorySlug),
        eq(posts.slug, postSlug),
        eq(posts.status, 'published')
      )
    )
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  return {
    ...results[0].post,
    category: results[0].category,
  };
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(categories.sortOrder);
}

/**
 * Get a category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const results = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);

  return results[0] || null;
}
