'use server';

import { revalidateTag } from 'next/cache';

import { announcements, db } from '@/lib/db';

import {
  adminMutationGuard,
  mapAdminUniqueViolation,
  mutationSuccess,
} from '../../_lib/action-factories';
import type { MutationResult } from '../../_lib/action-factories';
import type { AnnouncementMutationData } from '../_lib/mutation-helpers';
import { buildAnnouncementMutationValues, maybeNotifyAnnouncement } from '../_lib/mutation-helpers';
import { validateAnnouncementData } from '../_lib/validation';

export async function createAnnouncement(data: AnnouncementMutationData): Promise<MutationResult> {
  const guard = await adminMutationGuard(data, validateAnnouncementData);
  if (guard) {
    return guard;
  }

  let inserted: { id: string };
  try {
    [inserted] = await db
      .insert(announcements)
      .values({
        ...buildAnnouncementMutationValues(data),
        status: data.status || 'draft',
        visibility: data.visibility || 'public',
      })
      .returning({ id: announcements.id });
  } catch (err: unknown) {
    return mapAdminUniqueViolation(err, 'An announcement with this slug and locale already exists');
  }

  await maybeNotifyAnnouncement(inserted.id, data);

  // Invalidate the unstable_cache-wrapped banner fetch. Each ISR page picks up
  // the new banner on its next natural revalidation cycle — a layout-wide
  // revalidatePath here would evict every ISR entry under [locale]/(public),
  // which previously caused a 305x ISR Writes spike on Vercel.
  revalidateTag('announcements', { expire: 60 });

  return mutationSuccess(inserted.id, '/admin/announcements');
}
