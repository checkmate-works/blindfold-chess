import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { HiLockClosed } from 'react-icons/hi2';

import { getOptionalUser } from '@/lib/auth';

import {
  ListLink,
  ListLinkContainer,
  PageLayout,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedAnnouncementCount, getPublishedAnnouncementsPaginated } from './_lib/queries';

export const dynamic = 'force-dynamic';

const ANNOUNCEMENTS_PER_PAGE = 20;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'announcements' });

  const title = t('pageTitle');
  const description = t('pageDescription');

  return {
    ...generateCanonicalMetadata({ locale, path: 'announcements', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function AnnouncementsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'announcements' });

  const user = await getOptionalUser();
  const currentPage = Math.max(1, Number(page) || 1);
  const totalCount = await getPublishedAnnouncementCount();
  const totalPages = Math.max(1, Math.ceil(totalCount / ANNOUNCEMENTS_PER_PAGE));

  if (currentPage > totalPages && totalPages > 0) {
    notFound();
  }

  const offset = (currentPage - 1) * ANNOUNCEMENTS_PER_PAGE;
  const announcements = await getPublishedAnnouncementsPaginated(
    locale,
    ANNOUNCEMENTS_PER_PAGE,
    offset
  );

  return (
    <PageLayout title={t('pageTitle')} locale={locale} breadcrumb={[{ label: t('pageTitle') }]}>
      {announcements.length === 0 ? (
        <p className="text-muted-foreground">{t('noAnnouncements')}</p>
      ) : (
        <>
          <SectionTitle>{t('announcementsListTitle')}</SectionTitle>
          <ListLinkContainer>
            {announcements.map((announcement) => {
              const publishedDate = announcement.publishedAt
                ? new Date(announcement.publishedAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
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
                    announcement.visibility === 'members_only' && !user ? (
                      <>
                        <HiLockClosed className="size-3" /> {t('membersOnlyBadge')}
                      </>
                    ) : undefined
                  }
                />
              );
            })}
          </ListLinkContainer>
          <PaginationNav
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={(p) => `/${locale}/announcements${p > 1 ? `?page=${p}` : ''}`}
          />
        </>
      )}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
