'use server';

import { eq } from 'drizzle-orm';

import { announcements, db } from '@/lib/db';

import {
  adminFindOrFail,
  adminMutationGuard,
  mapAdminUniqueViolation,
  mutationSuccess,
} from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
import type { AnnouncementUpdateData } from '../_lib/mutation-helpers';
import { buildAnnouncementMutationValues, maybeNotifyAnnouncement } from '../_lib/mutation-helpers';
import { revalidateAnnouncements } from '../_lib/revalidate';
import { validateAnnouncementData } from '../_lib/validation';

export async function updateAnnouncement(
  id: string,
  data: AnnouncementUpdateData
): Promise<MutationResult> {
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
        ...buildAnnouncementMutationValues(data),
        status: data.status,
        visibility: data.visibility,
        showAsBanner: data.showAsBanner,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id));
  } catch (err: unknown) {
    return mapAdminUniqueViolation(err, 'An announcement with this slug and locale already exists');
  }

  await maybeNotifyAnnouncement(id, data);

  revalidateAnnouncements();

  return mutationSuccess(id, '/admin/announcements');
}
