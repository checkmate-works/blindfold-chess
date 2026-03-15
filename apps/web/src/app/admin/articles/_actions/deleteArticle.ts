'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { articles, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';

type DeleteResult = { success: true } | { error: string };

export async function deleteArticle(id: string): Promise<DeleteResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  await db.delete(articles).where(eq(articles.id, id));

  revalidatePath('/admin/articles');

  return { success: true };
}
