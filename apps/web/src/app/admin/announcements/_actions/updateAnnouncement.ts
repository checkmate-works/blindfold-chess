'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { notifyAllUsersOfAnnouncement } from '@/lib/announcement-notification';
import { announcements, db, userRoles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['draft', 'published'] as const;
const VALID_VISIBILITIES = ['public', 'members_only'] as const;

type UpdateData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  status: string;
  visibility: string;
  pinnedAt: string | null;
  publishedAt: string | null;
};

type UpdateResult = { success: true } | { error: string };

export async function updateAnnouncement(id: string, data: UpdateData): Promise<UpdateResult> {
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

  if (!VALID_VISIBILITIES.includes(data.visibility as (typeof VALID_VISIBILITIES)[number])) {
    return { error: 'invalid visibility' };
  }

  // Fetch current announcement to detect status change
  const [current] = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);

  if (!current) {
    return { error: 'not found' };
  }

  await db
    .update(announcements)
    .set({
      slug: data.slug,
      title: data.title,
      content: data.content,
      locale: data.locale,
      status: data.status,
      visibility: data.visibility,
      pinnedAt: data.pinnedAt ? new Date(data.pinnedAt) : null,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id));

  // Trigger notification when status changes to 'published'
  if (current.status !== 'published' && data.status === 'published') {
    await notifyAllUsersOfAnnouncement(id, data.slug);
  }

  revalidatePath('/admin/announcements');

  return { success: true };
}
