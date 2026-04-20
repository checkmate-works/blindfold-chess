'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { announcements } from '@/lib/db';

import { createAdminDeleteAction } from '../../_lib/action-factories';

const deleteBase = createAdminDeleteAction({
  table: announcements,
  revalidationPath: '/admin/announcements',
});

export async function deleteAnnouncement(id: string) {
  const result = await deleteBase(id);

  // revalidateTag invalidates the unstable_cache-wrapped banner fetch;
  // revalidatePath evicts ISR-rendered HTML under [locale]/(public)/ that has
  // the header/banner markup baked in from [locale]/layout.tsx.
  if ('success' in result) {
    revalidateTag('announcements', { expire: 60 });
    revalidatePath('/', 'layout');
  }

  return result;
}
