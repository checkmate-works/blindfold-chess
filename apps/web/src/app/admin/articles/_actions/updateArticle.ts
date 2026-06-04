'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { articles, db } from '@/lib/db';

import {
  adminFindOrFail,
  adminMutationGuard,
  mapAdminUniqueViolation,
  mutationSuccess,
} from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
import { buildArticleMutationValues } from '../_lib/build-mutation-values';
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

  const notFound = await adminFindOrFail(articles, id);
  if (notFound) return notFound;

  try {
    await db
      .update(articles)
      .set({
        ...buildArticleMutationValues(data),
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));
  } catch (err: unknown) {
    return mapAdminUniqueViolation(err, 'An article with this slug and locale already exists');
  }

  revalidatePath(`/admin/articles/${id}/edit`);
  revalidatePath(`/admin/articles/${id}/publish`);
  // Invalidate public article caches (unstable_cache with tag 'articles')
  // so that published article changes are reflected immediately on public pages.
  revalidateTag('articles', { expire: 60 });
  return mutationSuccess(id, '/admin/articles');
}
