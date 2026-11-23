'use server';

import { announcements } from '@/lib/db';
import { deleteAnnouncementWithLikes } from '@/lib/db/announcement-likes';

import { createAdminDeleteAction } from '../../_lib/action-factories';
import { revalidateAnnouncements } from '../_lib/revalidate';

const deleteBase = createAdminDeleteAction({
  table: announcements,
  revalidationPath: '/admin/announcements',
  deleteRow: deleteAnnouncementWithLikes,
  postDeleteHook: async () => {
    revalidateAnnouncements();
  },
});

export async function deleteAnnouncement(id: string) {
  return deleteBase(id);
}
