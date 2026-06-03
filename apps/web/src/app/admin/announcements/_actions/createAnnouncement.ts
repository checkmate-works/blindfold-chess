'use server';

import { revalidateTag } from 'next/cache';

import { announcements, db } from '@/lib/db';
import {
  hasAnnouncementNotification,
  notifyAllUsersOfAnnouncement,
} from '@/lib/notifications/announcement-notification';

import {
  adminMutationGuard,
  mapAdminUniqueViolation,
  mutationSuccess,
} from '../../_lib/action-factories';
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

  let inserted: { id: string };
  try {
    [inserted] = await db
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
  } catch (err: unknown) {
    return mapAdminUniqueViolation(err, 'An announcement with this slug and locale already exists');
  }

  if (data.sendNotification && data.status === 'published') {
    const alreadySent = await hasAnnouncementNotification(inserted.id);
    if (!alreadySent) {
      await notifyAllUsersOfAnnouncement(inserted.id, data.slug, data.title);
    }
  }

  // Invalidate the unstable_cache-wrapped banner fetch. Each ISR page picks up
  // the new banner on its next natural revalidation cycle — a layout-wide
  // revalidatePath here would evict every ISR entry under [locale]/(public),
  // which previously caused a 305x ISR Writes spike on Vercel.
  revalidateTag('announcements', { expire: 60 });

  return mutationSuccess(inserted.id, '/admin/announcements');
}
