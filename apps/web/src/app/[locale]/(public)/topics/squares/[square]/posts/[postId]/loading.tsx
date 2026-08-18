import { getTranslations } from 'next-intl/server';

import { BoardFrame, BoardSkeleton } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { ReplyCardsSkeleton } from '@/app/[locale]/(public)/topics/_components/ReplyCardsSkeleton';
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { BreadcrumbSkeleton } from '@/app/[locale]/_components/Breadcrumb';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

export default async function SquarePostDetailLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'topics' });
  const st = await getTranslations({ locale, namespace: 'topics.squares' });

  return (
    <div className="space-y-8">
      <PageTitle>{st('pageTitle')}</PageTitle>

      <PagePanel>
        {/* SectionTitle (authorView) — dynamic (author + square name) */}
        <SectionTitle>
          <span className="inline-block h-5 md:h-6 w-2/3 bg-muted rounded align-middle animate-pulse" />
        </SectionTitle>

        {/* SquareHighlightBoard — chess board */}
        <BoardFrame expandOnMobile>
          <BoardSkeleton />
        </BoardFrame>

        {/* Back link — dynamic (square name) */}
        <div>
          <Skeleton className="h-4 w-40 rounded" />
        </div>

        {/* Post card: avatar + name/date + body + actions */}
        <div className="p-4 bg-card border border-border rounded-lg space-y-4">
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
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
          {st('replies.title')}
          <span className="ml-1 inline-block h-4 w-12 align-middle bg-muted rounded animate-pulse" />
        </SectionTitle>

        {/* Reply cards */}
        <ReplyCardsSkeleton />

        {/* Breadcrumb (last item — readMore — is static; other items are dynamic) */}
        <BreadcrumbSkeleton
          crumbs={[
            { label: t('title') },
            { label: st('title') },
            { widthClass: 'w-12' },
            { label: st('readMore'), current: true },
          ]}
        />
      </PagePanel>
    </div>
  );
}
