import { announcements } from '@/lib/db';

import { createAdminSlugGroupListPage } from '../_components/AdminSlugGroupListPage';

export default createAdminSlugGroupListPage({
  table: announcements,
  translationNamespace: 'Admin.announcementsTable',
  basePath: '/admin/announcements',
  newButtonTranslationKey: 'newAnnouncement',
  emptyMessageKey: 'noAnnouncementsFound',
});
