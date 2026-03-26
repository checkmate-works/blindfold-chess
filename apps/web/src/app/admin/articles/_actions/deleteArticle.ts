'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { articles, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';

export async function deleteArticle(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  await db.delete(articles).where(eq(articles.id, id));

  revalidatePath('/admin/articles');

  return { success: true };
}
