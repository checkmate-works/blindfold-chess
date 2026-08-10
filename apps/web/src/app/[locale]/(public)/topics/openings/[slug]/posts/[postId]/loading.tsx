import { getTranslations } from 'next-intl/server';

import { BoardFrame, BoardSkeleton } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { MOVE_NAV_ROW_CLASS } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';
import { ReplyCardsSkeleton } from '@/app/[locale]/(public)/topics/_components/ReplyCardsSkeleton';
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
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
        <div className="p-4 bg-card border border-border rounded-lg space-y-4">
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
          {/* RatingDisplay (preference + proficiency) — opening-only */}
          <div className="space-y-2 animate-pulse">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-4 w-40 bg-muted rounded" />
          </div>
          {/* Post body */}
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-11/12" />
            <div className="h-4 bg-muted rounded w-4/5" />
          </div>
          {/* Like + (maybe) delete button */}
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
        </div>

        {/* Replies section */}
        <SectionTitle>
          {dt('replies.title')}
          <span className="ml-1 inline-block h-4 w-12 align-middle bg-muted rounded animate-pulse" />
        </SectionTitle>

        {/* Reply cards */}
        <ReplyCardsSkeleton />

        {/* Breadcrumb (last item — readMore — is static; other items are dynamic) */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <Skeleton className="w-6 h-6 rounded-sm" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{t('title')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{dt('title')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <Skeleton className="h-4 w-32 rounded" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{dt('readMore')}</span>
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}
