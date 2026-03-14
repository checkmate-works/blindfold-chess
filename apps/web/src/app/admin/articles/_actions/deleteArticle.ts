'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { articles, db, userRoles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

type DeleteResult = { success: true } | { error: string };

export async function deleteArticle(id: string): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'unauthorized' };
  }

  const [userRole] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .limit(1);

  if (!userRole || userRole.role !== 'admin') {
    return { error: 'unauthorized' };
  }

  await db.delete(articles).where(eq(articles.id, id));

  revalidatePath('/admin/articles');

  return { success: true };
}
