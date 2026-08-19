import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { formatLocalDate } from '@/lib/i18n/format-date';
import { buildPageHref, getPaginationParams } from '@/lib/pagination';

import { ListLink, ListLinkContainer, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MembersOnlyBadge } from './_components/MembersOnlyBadge';
import { getPublishedAnnouncementCount, getPublishedAnnouncementsPaginated } from './_lib/queries';

// 24h ISR window. Admin create/update/delete actions also call
// `revalidateTag('announcements', { expire: 60 })`, which together with
// the explicit `revalidatePath` in those actions is what guarantees
// freshness — the timer here is only a safety net for the rare case where
// the underlying row changes outside the admin action path (service-role
// SQL etc.). The previous 600s timer added no real freshness over the
// tag-driven invalidation but did generate a steady drip of ISR Writes;
// 86400s removes the drip without losing any user-visible behaviour.
// The members-only lock badge that previously kept this page on
// `force-dynamic` has moved into `MembersOnlyBadge` (client component,
// reads `useAuth`).
export const revalidate = 86400;

const ANNOUNCEMENTS_PER_PAGE = 20;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'announcements',
    path: 'announcements',
    titleKey: 'pageTitle',
    descriptionKey: 'pageDescription',
  });
}

export default async function AnnouncementsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'announcements' });

  const totalCount = await getPublishedAnnouncementCount();
  const { currentPage, totalPages, offset } = getPaginationParams(
    Number(page) || 1,
    totalCount,
    ANNOUNCEMENTS_PER_PAGE
  );

  if (currentPage > totalPages && totalPages > 0) {
    notFound();
  }
  const announcements = await getPublishedAnnouncementsPaginated(
    locale,
    ANNOUNCEMENTS_PER_PAGE,
    offset
  );

  return (
    <PageLayout title={t('pageTitle')} locale={locale} breadcrumb={[{ label: t('pageTitle') }]}>
      <SectionTitle>{t('announcementsListTitle')}</SectionTitle>
      {announcements.length === 0 ? (
        <p className="text-muted-foreground">{t('noAnnouncements')}</p>
      ) : (
        <>
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
                    announcement.visibility === 'members_only' ? <MembersOnlyBadge /> : undefined
                  }
                />
              );
            })}
          </ListLinkContainer>
          <PaginationNav
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={buildPageHref(`/${locale}/announcements`)}
            locale={locale}
          />
        </>
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
