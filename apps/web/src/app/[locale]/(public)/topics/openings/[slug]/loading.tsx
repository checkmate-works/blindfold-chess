import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

export default async function OpeningDetailLoading() {
  const t = await getTranslations('topics.openings.detail');

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>
          <div className="h-6 w-48 bg-muted rounded animate-pulse inline-block align-middle" />
        </SectionTitle>

        {/* OpeningBoardWithMoves skeleton */}
        <div className="space-y-3">
          <div className="max-w-xs mx-auto aspect-square bg-muted rounded animate-pulse" />

          <div className="flex justify-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-10 h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>

          <div className="flex justify-center">
            <div className="h-5 w-32 bg-muted rounded animate-pulse mt-2" />
          </div>

          <div className="flex justify-center mt-2">
            <div className="h-9 w-48 bg-muted rounded-md animate-pulse mt-1" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 mb-6">
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
        </div>

        <div className="flex gap-4 border-b border-border mb-6 pb-2">
          <div className="h-6 w-12 bg-muted rounded animate-pulse" />
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          <div className="h-6 w-12 bg-muted rounded animate-pulse" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-muted rounded-full" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
              <div className="h-3 bg-muted rounded w-20 mb-2" />
              <div className="h-4 bg-muted rounded w-full mb-1" />
              <div className="h-4 bg-muted rounded w-4/5" />
            </div>
          ))}
        </div>

        <Divider />

        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </PagePanel>
    </div>
  );
}
