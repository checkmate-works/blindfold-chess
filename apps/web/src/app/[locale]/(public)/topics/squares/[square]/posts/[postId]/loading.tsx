import { getTranslations } from 'next-intl/server';

import { BoardFrame, BoardSkeleton } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

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
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
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
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-4 bg-card border border-border rounded-lg space-y-3 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-3 w-40 bg-muted rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Breadcrumb (last item — readMore — is static; other items are dynamic) */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{t('title')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{st('title')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <div className="h-4 w-12 bg-muted rounded animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{st('readMore')}</span>
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}
