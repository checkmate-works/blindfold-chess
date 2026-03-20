'use server';

import { revalidatePath } from 'next/cache';

import {
  hasAnnouncementNotification,
  notifyAllUsersOfAnnouncement,
} from '@/lib/announcement-notification';
import { announcements, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';
import { validateAnnouncementData } from '../_lib/validation';

type CreateData = {
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

type CreateResult = { success: true; id: string } | { error: string };

export async function createAnnouncement(data: CreateData): Promise<CreateResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const validationError = validateAnnouncementData(data);
  if (validationError) {
    return { error: validationError };
  }

  const [inserted] = await db
    .insert(announcements)
    .values({
      slug: data.slug,
      title: data.title,
      content: data.content,
      locale: data.locale,
      status: data.status || 'draft',
      visibility: data.visibility || 'public',
      pinnedAt: data.pinnedAt ? new Date(data.pinnedAt) : null,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    })
    .returning({ id: announcements.id });

  if (data.sendNotification && data.status === 'published') {
    const alreadySent = await hasAnnouncementNotification(inserted.id);
    if (!alreadySent) {
      await notifyAllUsersOfAnnouncement(inserted.id, data.slug, data.title);
    }
  }

  revalidatePath('/admin/announcements');

  return { success: true, id: inserted.id };
}
