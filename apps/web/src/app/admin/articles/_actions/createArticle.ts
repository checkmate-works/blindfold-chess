'use server';

import { articles, db } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';

import { adminMutationGuard, mutationSuccess } from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
import type { ArticleMutationData } from '../_lib/types';
import { validateArticleData } from '../_lib/validation';

/**
 * Server Action: Create a new article.
 *
 * Inserts a row into the `articles` table. The `contentFormat` defaults to
 * `'markdown'` if not provided (for backward compatibility), but the admin
 * editor always sends `'tiptap_json'`.
 *
 * @throws Re-throws non-unique-constraint errors. Returns `{ error }` for
 *         validation failures and slug+locale uniqueness violations (PG 23505).
 */
export async function createArticle(data: ArticleMutationData): Promise<MutationResult> {
  const guard = await adminMutationGuard(data, validateArticleData);
  if (guard) {
    return guard;
  }

  let inserted: { id: string };
  try {
    [inserted] = await db
      .insert(articles)
      .values({
        slug: data.slug,
        title: data.title,
        content: data.content,
        contentJson: data.contentJson ?? null,
        contentFormat: data.contentFormat ?? 'markdown',
        locale: data.locale,
        status: data.status || 'draft',
        pinnedAt: data.pinnedAt ? new Date(data.pinnedAt) : null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        excerpt: data.excerpt || null,
        description: data.description || null,
        categoryId: data.categoryId || null,
        icon: data.icon || null,
      })
      .returning({ id: articles.id });
  } catch (err: unknown) {
    if (extractPgErrorCode(err) === '23505') {
      return { error: 'An article with this slug and locale already exists' };
    }
    throw err;
  }

  return mutationSuccess(inserted.id, '/admin/articles');
}
