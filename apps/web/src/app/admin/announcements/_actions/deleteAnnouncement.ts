'use server';

import { announcements } from '@/lib/db';

import { createAdminDeleteAction } from '../../_lib/action-factories';
import { revalidateAnnouncements } from '../_lib/revalidate';

const deleteBase = createAdminDeleteAction({
  table: announcements,
  revalidationPath: '/admin/announcements',
  postDeleteHook: async () => {
    revalidateAnnouncements();
  },
});

export async function deleteAnnouncement(id: string) {
  return deleteBase(id);
}
