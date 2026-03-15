'use server';

import { revalidatePath } from 'next/cache';

import {
  hasAnnouncementNotification,
  notifyAllUsersOfAnnouncement,
} from '@/lib/announcement-notification';
import { announcements, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';

const VALID_STATUSES = ['draft', 'published'] as const;
const VALID_VISIBILITIES = ['public', 'members_only'] as const;

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

  if (data.status === 'published' && !data.publishedAt) {
    return { error: 'Published date is required when status is published' };
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
