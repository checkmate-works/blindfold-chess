'use server';

import { revalidatePath } from 'next/cache';

import { articles, db } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';

import { requireAdmin } from '../../_lib/auth';
import type { ArticleMutationData } from '../_lib/types';
import { validateArticleData } from '../_lib/validation';

type CreateResult = { success: true; id: string } | { error: string };

export async function createArticle(data: ArticleMutationData): Promise<CreateResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const validationError = validateArticleData(data);
  if (validationError) {
    return { error: validationError };
  }

  let inserted: { id: string };
  try {
    [inserted] = await db
      .insert(articles)
      .values({
        slug: data.slug,
        title: data.title,
        content: data.content,
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

  revalidatePath('/admin/articles');

  return { success: true, id: inserted.id };
}
