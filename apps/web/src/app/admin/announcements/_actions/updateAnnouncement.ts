'use server';

import { eq } from 'drizzle-orm';

import {
  hasAnnouncementNotification,
  notifyAllUsersOfAnnouncement,
} from '@/lib/announcement-notification';
import { announcements, db } from '@/lib/db';

import { adminMutationGuard, mutationSuccess } from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
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

export async function updateAnnouncement(id: string, data: UpdateData): Promise<MutationResult> {
  const guard = await adminMutationGuard(data, validateAnnouncementData);
  if (guard) {
    return guard;
  }

  const [current] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);

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

  if (data.sendNotification && data.status === 'published') {
    const alreadySent = await hasAnnouncementNotification(id);
    if (!alreadySent) {
      await notifyAllUsersOfAnnouncement(id, data.slug, data.title);
    }
  }

  return mutationSuccess(id, '/admin/announcements');
}
