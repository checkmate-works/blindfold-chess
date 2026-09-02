import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { FaBullhorn } from 'react-icons/fa';

import { AnnouncementListLink } from '@/app/[locale]/(public)/announcements/_components/AnnouncementListLink';
import { getPublishedAnnouncementsPaginated } from '@/app/[locale]/(public)/announcements/_lib/queries';
import { ListLinkContainer, SectionTitle } from '@/app/[locale]/_components';

type Props = {
  locale: string;
};

export async function LatestAnnouncements({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'landing' });

  const announcements = await getPublishedAnnouncementsPaginated(locale, 3, 0);

  if (announcements.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-2">
        <FaBullhorn className="text-primary h-5 w-5 mb-2" />
        <SectionTitle className="flex-1 mb-2">{t('dashboard.announcements')}</SectionTitle>
      </div>
      <ListLinkContainer>
        {announcements.map((announcement) => (
          <AnnouncementListLink key={announcement.id} announcement={announcement} locale={locale} />
        ))}
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
