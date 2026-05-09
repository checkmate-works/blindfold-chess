import type { ArticleMutationData } from './types';

/**
 * Map an `ArticleMutationData` payload onto the column values shared by both
 * `createArticle` (INSERT) and `updateArticle` (UPDATE). Each caller adds the
 * fields that differ between create and update (`status`, `updatedAt`).
 *
 * Keeping the column list in one place ensures the two paths stay in lockstep
 * when fields are added or removed from the `articles` table.
 */
export function buildArticleMutationValues(data: ArticleMutationData) {
  return {
    slug: data.slug,
    title: data.title,
    content: data.content,
    contentJson: data.contentJson ?? null,
    contentFormat: data.contentFormat ?? 'markdown',
    locale: data.locale,
    pinnedAt: data.pinnedAt ? new Date(data.pinnedAt) : null,
    publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    excerpt: data.excerpt || null,
    description: data.description || null,
    categoryId: data.categoryId || null,
    icon: data.icon || null,
  };
}
