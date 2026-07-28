'use server';

import { revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { ARTICLES_CACHE_TAG } from '@/lib/cache-tags';
import { articles, db } from '@/lib/db';

import { createAdminDeleteAction } from '../../_lib/action-factories';
import { revalidatePublicArticlePages } from '../_lib/revalidate-public';

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

  revalidateTag(ARTICLES_CACHE_TAG, { expire: 60 });
  revalidatePublicArticlePages(existing?.slug);
  return result;
}
