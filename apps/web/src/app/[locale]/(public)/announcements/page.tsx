import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { HiLockClosed } from 'react-icons/hi2';

import { getOptionalUser } from '@/lib/auth';

import {
  Divider,
  ListLink,
  ListLinkContainer,
  PagePanel,
  PageTitle,
  PaginationNav,
} from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedAnnouncementCount, getPublishedAnnouncementsPaginated } from './_lib/queries';

const ANNOUNCEMENTS_PER_PAGE = 20;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'announcements' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'announcements' }),
    title: t('pageTitle'),
    description: t('pageDescription'),
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
    <div className="space-y-12">
      <header>
        <PageTitle>{t('pageTitle')}</PageTitle>
      </header>

      <PagePanel>
        {announcements.length === 0 ? (
          <p className="text-muted-foreground">{t('noAnnouncements')}</p>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground">{t('announcementsListTitle')}</h2>
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

        <AdBanner slot="banner-standard" locale={locale} />

        <Divider />

        <Breadcrumb items={[{ label: t('pageTitle') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
