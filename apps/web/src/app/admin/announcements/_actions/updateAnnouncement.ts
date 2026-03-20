'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import {
  hasAnnouncementNotification,
  notifyAllUsersOfAnnouncement,
} from '@/lib/announcement-notification';
import { announcements, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';
import { validateAnnouncementData } from '../_lib/validation';

type UpdateData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  status: string;
  visibility: string;
  pinnedAt: string | null;
  publishedAt: string | null;
  sendNotification?: boolean;
};

type UpdateResult = { success: true; id: string } | { error: string };

export async function updateAnnouncement(id: string, data: UpdateData): Promise<UpdateResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const validationError = validateAnnouncementData(data);
  if (validationError) {
    return { error: validationError };
  }

  // Fetch current announcement to verify it exists
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

  // Trigger notification only when explicitly requested and not already sent
  if (data.sendNotification && data.status === 'published') {
    const alreadySent = await hasAnnouncementNotification(id);
    if (!alreadySent) {
      await notifyAllUsersOfAnnouncement(id, data.slug, data.title);
    }
  }

  revalidatePath('/admin/announcements');

  return { success: true, id };
}
