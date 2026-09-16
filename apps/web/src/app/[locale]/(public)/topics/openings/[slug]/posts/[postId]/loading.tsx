import { getTranslations } from 'next-intl/server';

import { BoardFrame, BoardSkeleton } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { MOVE_NAV_ROW_CLASS } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';
import { PostCardSkeleton } from '@/app/[locale]/(public)/topics/_components/PostCardSkeleton';
import { ReplyAffordanceSkeleton } from '@/app/[locale]/(public)/topics/_components/ReplyAffordanceSkeleton';
import { ReplyCardsSkeleton } from '@/app/[locale]/(public)/topics/_components/ReplyCardsSkeleton';
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { BreadcrumbSkeleton } from '@/app/[locale]/_components/Breadcrumb';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

export default async function OpeningPostDetailLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings' });

  return (
    <div className="space-y-8">
      <PageTitle>{dt('detail.pageTitle')}</PageTitle>

      <PagePanel>
        {/* SectionTitle (authorView) — dynamic (author + opening name) */}
        <SectionTitle>
          <span className="inline-block h-5 md:h-6 w-2/3 bg-muted rounded align-middle animate-pulse" />
        </SectionTitle>

        {/* OpeningBoardWithMoves: move list + board + nav row + new-game button */}
        <div className="space-y-3">
          <BoardFrame expandOnMobile>
            <div className="flex items-center gap-1 px-2 py-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-16 rounded" />
              ))}
            </div>
            <BoardSkeleton />
            {/* Same reserved height as the real strip, which is touch-sized
                below `sm` — a fixed 40px row would shift the page on hydrate. */}
            <div className={`flex items-center justify-center ${MOVE_NAV_ROW_CLASS}`}>
              <Skeleton className="h-12 w-52 rounded" />
            </div>
          </BoardFrame>
          <div className="flex justify-center">
            <Skeleton className="h-9 w-40 rounded" />
          </div>
        </div>

        {/* Back link — dynamic (opening name) */}
        <div>
          <Skeleton className="h-4 w-48 rounded" />
        </div>

        {/* Post card: avatar + name/date + rating + body + actions */}
        <PostCardSkeleton
          afterHeader={
            /* RatingDisplay (preference + proficiency) — opening-only */
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
          }
        />

        {/* Replies section */}
        <SectionTitle>
          {dt('replies.title')}
          <span className="ml-1 inline-block h-4 w-12 align-middle bg-muted rounded animate-pulse" />
        </SectionTitle>

        {/* Reply affordance: the CTA, or the reply-permission notice in its place */}
        <ReplyAffordanceSkeleton />

        {/* Reply cards */}
        <ReplyCardsSkeleton />

        {/* Breadcrumb (last item — readMore — is static; other items are dynamic) */}
        <BreadcrumbSkeleton
          crumbs={[
            { label: t('title') },
            { label: dt('title') },
            { widthClass: 'w-32' },
            { label: dt('readMore'), current: true },
          ]}
        />
      </PagePanel>
    </div>
  );
}
