import Link from 'next/link';

import { type Announcement, announcements } from '@/lib/db';

import { createAdminListPage } from '../_components/AdminListPage';
import { DeleteAnnouncementButton } from './_components/DeleteAnnouncementButton';

export default createAdminListPage<Announcement>({
  table: announcements,
  translationNamespace: 'Admin.announcementsTable',
  basePath: '/admin/announcements',
  newButtonTranslationKey: 'newAnnouncement',
  emptyMessageKey: 'noAnnouncementsFound',
  headers: (t) => [
    t('titleColumn'),
    t('locale'),
    t('status'),
    t('visibility'),
    t('pinned'),
    t('publishedAt'),
    t('actions'),
  ],
  renderRow: (item, t) => (
    <tr key={item.id} className="border-t border-border">
      <td className="px-4 py-3">
        <div>
          <div className="font-medium">{item.title}</div>
          <div className="text-xs text-muted-foreground">{item.slug}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{item.locale}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            item.status === 'published'
              ? 'bg-success-soft text-success-soft-foreground'
              : 'bg-warning-soft text-warning-soft-foreground'
          }`}
        >
          {item.status === 'published' ? t('published') : t('draft')}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {item.visibility === 'public' ? t('public') : t('members')}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{item.pinnedAt ? t('yes') : t('no')}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '-'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/announcements/${item.id}/edit`}
            className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
          >
            {t('edit')}
          </Link>
          <DeleteAnnouncementButton
            id={item.id}
            title={item.title}
            labels={{
              deleteButton: t('delete'),
              modalTitle: t('deleteModalTitle'),
              modalMessage: t('deleteModalMessage'),
              cancel: t('deleteModalCancel'),
              confirm: t('deleteModalConfirm'),
              deleting: t('deleteModalDeleting'),
            }}
          />
        </div>
      </td>
    </tr>
  ),
});
