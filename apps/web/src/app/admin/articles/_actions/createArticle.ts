'use server';

import { articles, db } from '@/lib/db';

import {
  adminMutationGuard,
  mapAdminUniqueViolation,
  mutationSuccess,
} from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
import { buildArticleMutationValues } from '../_lib/build-mutation-values';
import { revalidateArticles } from '../_lib/revalidate-public';
import type { ArticleMutationData } from '../_lib/types';
import { validateArticleData } from '../_lib/validation';

/**
 * Server Action: Create a new article.
 *
 * Inserts a row into the `articles` table. The `contentFormat` defaults to
 * `'markdown'` if not provided (for backward compatibility), but the admin
 * editor always sends `'tiptap_json'`.
 *
 * Busts the public list caches, and the detail pages for the new slug — a
 * slug that was published, deleted, and created again would otherwise keep
 * serving whatever the Full Route Cache still holds for that URL.
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
        ...buildArticleMutationValues(data),
        status: data.status || 'draft',
      })
      .returning({ id: articles.id });
  } catch (err: unknown) {
    return mapAdminUniqueViolation(err, 'An article with this slug and locale already exists');
  }

  revalidateArticles(data.slug);
  return mutationSuccess(inserted.id, '/admin/articles');
}
