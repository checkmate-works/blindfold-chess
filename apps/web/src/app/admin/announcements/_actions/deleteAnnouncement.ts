'use server';

import { revalidateTag } from 'next/cache';

import { announcements } from '@/lib/db';

import { createAdminDeleteAction } from '../../_lib/action-factories';

const deleteBase = createAdminDeleteAction({
  table: announcements,
  revalidationPath: '/admin/announcements',
});

export async function deleteAnnouncement(id: string) {
  const result = await deleteBase(id);

  // Invalidate the SSR banner cache so deleted banners disappear from the
  // header without waiting for the 5-minute unstable_cache revalidation window.
  if ('success' in result) {
    revalidateTag('announcements', { expire: 60 });
  }

  return result;
}
