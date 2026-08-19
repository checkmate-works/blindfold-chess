import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { FaBullhorn } from 'react-icons/fa';

import { formatLocalDate } from '@/lib/i18n/format-date';

import { getPublishedAnnouncementsPaginated } from '@/app/[locale]/(public)/announcements/_lib/queries';
import { ListLink, ListLinkContainer, SectionTitle } from '@/app/[locale]/_components';

type Props = {
  locale: string;
  userId?: string;
};

export async function LatestAnnouncements({ locale, userId }: Props) {
  const [t, tAnnouncements] = await Promise.all([
    getTranslations({ locale, namespace: 'landing' }),
    getTranslations({ locale, namespace: 'announcements' }),
  ]);

  const announcements = await getPublishedAnnouncementsPaginated(locale, 3, 0);

  if (announcements.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-2">
        <FaBullhorn className="text-primary h-5 w-5 mb-2" />
        <SectionTitle className="flex-1 mb-2">{t('dashboard.announcements')}</SectionTitle>
      </div>
      <ListLinkContainer>
        {announcements.map((announcement) => {
          const publishedDate = announcement.publishedAt
            ? formatLocalDate(new Date(announcement.publishedAt), locale)
            : undefined;

          return (
            <ListLink
              key={announcement.id}
              href={`/announcements/${announcement.slug}`}
              icon="📢"
              title={announcement.title}
              meta={publishedDate}
              locale={locale}
              isPinned={announcement.pinnedAt !== null}
              badge={
                announcement.visibility === 'members_only' && !userId
                  ? tAnnouncements('membersOnlyBadge')
                  : undefined
              }
            />
          );
        })}
      </ListLinkContainer>
      <div className="mt-4 text-right">
        <Link
          href="/announcements"
          locale={locale}
          className="text-sm text-primary hover:underline font-medium"
        >
          {t('dashboard.viewAll')}
        </Link>
      </div>
    </div>
  );
}
