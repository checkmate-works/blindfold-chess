'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { ARTICLES_CACHE_TAG } from '@/lib/cache-tags';
import { articles, db } from '@/lib/db';

import {
  adminMutationGuard,
  mapAdminUniqueViolation,
  mutationSuccess,
} from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
import { buildArticleMutationValues } from '../_lib/build-mutation-values';
import { revalidatePublicArticlePages } from '../_lib/revalidate-public';
import type { ArticleMutationData } from '../_lib/types';
import { validateArticleData } from '../_lib/validation';

/**
 * Server Action: Update an existing article.
 *
 * Overwrites all mutable fields on the `articles` row. The `contentFormat`
 * defaults to `'markdown'` if not provided (for backward compatibility).
 * Revalidates the admin edit / publish pages, the public article list caches,
 * and the prerendered public detail pages — including the article's PREVIOUS
 * slug when the update renamed it, since the old URL keeps serving a stale
 * static render otherwise.
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

  // Read the current slug rather than using `adminFindOrFail`: the existence
  // check is the same single-row lookup, and a rename needs the old slug to
  // invalidate the page still cached under it.
  const [current] = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);
  if (!current) return { error: 'not found' };

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
  // Public list queries (unstable_cache) ...
  revalidateTag(ARTICLES_CACHE_TAG, { expire: 60 });
  // ... and the prerendered public detail pages, which the tag cannot reach.
  revalidatePublicArticlePages(data.slug, current.slug);
  return mutationSuccess(id, '/admin/articles');
}
