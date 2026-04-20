'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { announcements, db } from '@/lib/db';
import {
  hasAnnouncementNotification,
  notifyAllUsersOfAnnouncement,
} from '@/lib/notifications/announcement-notification';

import { adminMutationGuard, mutationSuccess } from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
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

export async function createAnnouncement(data: CreateData): Promise<MutationResult> {
  const guard = await adminMutationGuard(data, validateAnnouncementData);
  if (guard) {
    return guard;
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

  // revalidateTag invalidates the unstable_cache-wrapped banner fetch;
  // revalidatePath evicts ISR-rendered HTML under [locale]/(public)/ that has
  // the header/banner markup baked in from [locale]/layout.tsx.
  revalidateTag('announcements', { expire: 60 });
  revalidatePath('/', 'layout');

  return mutationSuccess(inserted.id, '/admin/announcements');
}
