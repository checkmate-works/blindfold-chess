import { getTranslations } from 'next-intl/server';

import { AdminBadge } from '@/app/admin/_components/AdminBadge';
import { AdminDataTable } from '@/app/admin/_components/AdminDataTable';
import { AdminUserLink } from '@/app/admin/_components/AdminUserLink';
import { formatDateTime } from '@/app/admin/_lib/format';

import { ANNOUNCEMENT_LIKERS_LIMIT, getAnnouncementLikers } from '@/lib/db/announcement-likes';

/**
 * "Who liked this" for one announcement (all locales of the slug), newest
 * first. Usernames link to the admin user page, like every other admin list;
 * email addresses are deliberately not shown (see `AdminUserLink`).
 */
export async function AnnouncementLikersSection({ slug }: { slug: string }) {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  const { likers, total } = await getAnnouncementLikers(slug);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-1">
        {t('announcementsTable.likers.title', { count: total })}
      </h2>
      {total > likers.length && (
        <p className="mb-3 text-sm text-muted-foreground">
          {t('announcementsTable.likers.truncated', { shown: ANNOUNCEMENT_LIKERS_LIMIT })}
        </p>
      )}
      <AdminDataTable
        headers={[
          t('announcementsTable.likers.user'),
          t('announcementsTable.likers.locale'),
          t('announcementsTable.likers.likedAt'),
        ]}
        items={likers}
        emptyMessage={t('announcementsTable.likers.empty')}
        renderRow={(liker, i) => (
          <tr key={`${liker.userId ?? 'purged'}-${i}`} className="border-t border-border">
            <td className="px-4 py-3">
              <AdminUserLink
                userId={liker.userId}
                username={liker.username}
                deletedLabel={t('deletedUser')}
                provisionalLabel={t('provisionalUser')}
              />
            </td>
            <td className="px-4 py-3">
              <AdminBadge variant="accent">{liker.locale}</AdminBadge>
            </td>
            <td className="px-4 py-3 text-muted-foreground">{formatDateTime(liker.likedAt)}</td>
          </tr>
        )}
      />
    </section>
  );
}
