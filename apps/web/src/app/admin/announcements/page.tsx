import { announcements } from '@/lib/db';
import { getAnnouncementLikeCountsBySlug } from '@/lib/db/announcement-likes';

import { createAdminSlugGroupListPage } from '../_components/AdminSlugGroupListPage';

export default createAdminSlugGroupListPage({
  table: announcements,
  translationNamespace: 'Admin.announcementsTable',
  basePath: '/admin/announcements',
  newButtonTranslationKey: 'newAnnouncement',
  emptyMessageKey: 'noAnnouncementsFound',
  loadLikeCounts: getAnnouncementLikeCountsBySlug,
});
