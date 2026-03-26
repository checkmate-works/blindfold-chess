'use server';

import { announcements } from '@/lib/db';

import { createAdminDeleteAction } from '../../_lib/action-factories';

const deleteBase = createAdminDeleteAction({
  table: announcements,
  revalidationPath: '/admin/announcements',
});

export async function deleteAnnouncement(id: string) {
  return deleteBase(id);
}
