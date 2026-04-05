'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { articles, db } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';

import { adminMutationGuard, mutationSuccess } from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
import type { ArticleMutationData } from '../_lib/types';
import { validateArticleData } from '../_lib/validation';

/**
 * Server Action: Update an existing article.
 *
 * Overwrites all mutable fields on the `articles` row. The `contentFormat`
 * defaults to `'markdown'` if not provided (for backward compatibility).
 * Revalidates the edit and publish pages after a successful update.
 *
 * @throws Re-throws non-unique-constraint errors. Returns `{ error }` for
 *         validation failures, not-found, and slug+locale uniqueness violations.
 */
export async function updateArticle(
  id: string,
  data: ArticleMutationData
): Promise<MutationResult> {
  const guard = await adminMutationGuard(data, validateArticleData);
  if (guard) {
    return guard;
  }

  const [current] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);

  if (!current) {
    return { error: 'not found' };
  }

  try {
    await db
      .update(articles)
      .set({
        slug: data.slug,
        title: data.title,
        content: data.content,
        contentJson: data.contentJson ?? null,
        contentFormat: data.contentFormat ?? 'markdown',
        locale: data.locale,
        status: data.status,
        pinnedAt: data.pinnedAt ? new Date(data.pinnedAt) : null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        excerpt: data.excerpt || null,
        description: data.description || null,
        categoryId: data.categoryId || null,
        icon: data.icon || null,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));
  } catch (err: unknown) {
    if (extractPgErrorCode(err) === '23505') {
      return { error: 'An article with this slug and locale already exists' };
    }
    throw err;
  }

  revalidatePath(`/admin/articles/${id}/edit`);
  revalidatePath(`/admin/articles/${id}/publish`);
  // Invalidate public article caches (unstable_cache with tag 'articles')
  // so that published article changes are reflected immediately on public pages.
  revalidateTag('articles', { expire: 60 });
  return mutationSuccess(id, '/admin/articles');
}
