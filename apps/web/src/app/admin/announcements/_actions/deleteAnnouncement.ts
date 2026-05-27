'use server';

import { revalidateTag } from 'next/cache';

import { announcements } from '@/lib/db';

import { createAdminDeleteAction } from '../../_lib/action-factories';

const deleteBase = createAdminDeleteAction({
  table: announcements,
  revalidationPath: '/admin/announcements',
  // Invalidate the unstable_cache-wrapped banner fetch. Each ISR page picks up
  // the change on its next natural revalidation cycle — a layout-wide
  // revalidatePath here would evict every ISR entry under [locale]/(public),
  // which previously caused a 305x ISR Writes spike on Vercel.
  postDeleteHook: async () => {
    revalidateTag('announcements', { expire: 60 });
  },
});

export async function deleteAnnouncement(id: string) {
  return deleteBase(id);
}
