'use server';

import { revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { announcements, db } from '@/lib/db';
import {
  hasAnnouncementNotification,
  notifyAllUsersOfAnnouncement,
} from '@/lib/notifications/announcement-notification';

import {
  adminFindOrFail,
  adminMutationGuard,
  mapAdminUniqueViolation,
  mutationSuccess,
} from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
import { validateAnnouncementData } from '../_lib/validation';

type UpdateData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  status: string;
  visibility: string;
  showAsBanner: boolean;
  pinnedAt: string | null;
  publishedAt: string | null;
  sendNotification?: boolean;
};

export async function updateAnnouncement(id: string, data: UpdateData): Promise<MutationResult> {
  const guard = await adminMutationGuard(data, validateAnnouncementData);
  if (guard) {
    return guard;
  }

  const notFound = await adminFindOrFail(announcements, id);
  if (notFound) return notFound;

  try {
    await db
      .update(announcements)
      .set({
        slug: data.slug,
        title: data.title,
        content: data.content,
        locale: data.locale,
        status: data.status,
        visibility: data.visibility,
        showAsBanner: data.showAsBanner,
        pinnedAt: data.pinnedAt ? new Date(data.pinnedAt) : null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id));
  } catch (err: unknown) {
    return mapAdminUniqueViolation(err, 'An announcement with this slug and locale already exists');
  }

  if (data.sendNotification && data.status === 'published') {
    const alreadySent = await hasAnnouncementNotification(id);
    if (!alreadySent) {
      await notifyAllUsersOfAnnouncement(id, data.slug, data.title);
    }
  }

  // Invalidate the unstable_cache-wrapped banner fetch. Each ISR page picks up
  // the new banner on its next natural revalidation cycle — a layout-wide
  // revalidatePath here would evict every ISR entry under [locale]/(public),
  // which previously caused a 305x ISR Writes spike on Vercel.
  revalidateTag('announcements', { expire: 60 });

  return mutationSuccess(id, '/admin/announcements');
}
