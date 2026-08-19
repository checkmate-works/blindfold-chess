'use server';

import { eq } from 'drizzle-orm';

import { articles, db } from '@/lib/db';

import { createAdminDeleteAction } from '../../_lib/action-factories';
import { revalidateArticles } from '../_lib/revalidate-public';

const deleteBase = createAdminDeleteAction({
  table: articles,
  revalidationPath: '/admin/articles',
});

/**
 * Server Action: Delete an article.
 *
 * The slug is read BEFORE the delete: `/[locale]/articles/[slug]` is
 * prerendered, so without invalidating that URL the deleted article keeps
 * being served from the static cache until its 1800 s ISR window lapses. The
 * generic delete factory only ever knows the row id, hence the lookup here.
 */
export async function deleteArticle(id: string) {
  const [existing] = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);

  const result = await deleteBase(id);
  if ('error' in result) return result;

  revalidateArticles(existing?.slug);
  return result;
}
