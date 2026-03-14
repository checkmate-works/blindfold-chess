'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { articles, db, userRoles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['draft', 'published'] as const;

type UpdateData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  status: string;
  pinnedAt: string | null;
  publishedAt: string | null;
};

type UpdateResult = { success: true; id: string } | { error: string };

export async function updateArticle(id: string, data: UpdateData): Promise<UpdateResult> {
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

  if (!data.slug || data.slug.length > 255) {
    return { error: 'invalid slug' };
  }

  if (!data.title || data.title.length > 255) {
    return { error: 'invalid title' };
  }

  if (!data.content) {
    return { error: 'invalid content' };
  }

  if (!data.locale || data.locale.length > 10) {
    return { error: 'invalid locale' };
  }

  if (!VALID_STATUSES.includes(data.status as (typeof VALID_STATUSES)[number])) {
    return { error: 'invalid status' };
  }

  if (data.status === 'published' && !data.publishedAt) {
    return { error: 'Published date is required when status is published' };
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
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id));

  revalidatePath('/admin/articles');

  return { success: true, id };
}
