'use server';

import { announcements } from '@/lib/db';
import { moveLikesOffVariantBeingDeleted } from '@/lib/db/announcement-likes';

import { createAdminDeleteAction } from '../../_lib/action-factories';
import { revalidateAnnouncements } from '../_lib/revalidate';

const deleteBase = createAdminDeleteAction({
  table: announcements,
  revalidationPath: '/admin/announcements',
  preDeleteHook: moveLikesOffVariantBeingDeleted,
  postDeleteHook: async () => {
    revalidateAnnouncements();
  },
});

export async function deleteAnnouncement(id: string) {
  return deleteBase(id);
}
