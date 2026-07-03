import { createAdminSlugDetailPage } from '@/app/admin/_components/AdminSlugDetailPage';
import { eq } from 'drizzle-orm';

import { type Announcement, announcements, db } from '@/lib/db';

import { DeleteAnnouncementButton } from '../../_components/DeleteAnnouncementButton';

async function getAnnouncementsBySlug(slug: string): Promise<Announcement[]> {
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.slug, slug))
    .orderBy(announcements.locale);
}

export default createAdminSlugDetailPage({
  fetchBySlug: getAnnouncementsBySlug,
  translationNamespace: 'Admin.announcementsTable',
  basePath: '/admin/announcements',
  publicPathSegment: 'announcements',
  emptyMessageKey: 'slugDetail.noAnnouncementsFound',
  DeleteButton: DeleteAnnouncementButton,
});
