import { getTranslations } from 'next-intl/server';

import { BoardSkeleton } from '@/app/_components';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

export default async function ChunkPostDetailLoading() {
  const ct = await getTranslations('topics.chunks');

  return (
    <div className="space-y-8">
      <PageTitle>{ct('detail.pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>
          <span className="inline-block h-5 md:h-6 w-2/3 bg-muted rounded align-middle animate-pulse" />
        </SectionTitle>

        <div className="max-w-xs mx-auto">
          <BoardSkeleton />
        </div>

        <div>
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        </div>

        <div className="p-4 bg-card border border-border rounded-lg space-y-4">
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-11/12" />
            <div className="h-4 bg-muted rounded w-4/5" />
          </div>
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
        </div>

        <SectionTitle>
          {ct('replies.title')}
          <span className="ml-1 inline-block h-4 w-12 align-middle bg-muted rounded animate-pulse" />
        </SectionTitle>

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
      </PagePanel>
    </div>
  );
}
