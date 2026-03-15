'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { articles, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';
import type { ArticleMutationData } from '../_lib/types';
import { validateArticleData } from '../_lib/validation';

type UpdateResult = { success: true; id: string } | { error: string };

export async function updateArticle(id: string, data: ArticleMutationData): Promise<UpdateResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const validationError = validateArticleData(data);
  if (validationError) {
    return { error: validationError };
  }

  // Fetch current article to verify it exists
  const [current] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);

  if (!current) {
    return { error: 'not found' };
  }

  await db
    .update(articles)
    .set({
      slug: data.slug,
      title: data.title,
      content: data.content,
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

  revalidatePath('/admin/articles');

  return { success: true, id };
}
