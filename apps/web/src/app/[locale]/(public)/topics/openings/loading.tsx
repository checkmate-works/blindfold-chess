import { getLocale, getTranslations } from 'next-intl/server';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

import { TopicCardSkeleton } from '../_components/TopicCardSkeleton';
import { TopicTabsSkeleton } from '../_components/TopicTabsSkeleton';

export default async function OpeningsLoading() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'topics' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('openings.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('openings.subtitle')}</SectionTitle>

        <div className="mb-6">
          <TopicTabsSkeleton />
        </div>

        <SectionTitle>{t('openings.recentPosts')}</SectionTitle>
        <TopicCardSkeleton count={3} />

        <div className="mt-8 mb-6">
          <SectionTitle>
            <div className="h-6 w-32 bg-muted rounded animate-pulse inline-block align-middle" />
          </SectionTitle>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-9 w-40 bg-muted rounded-md animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-lg border border-border bg-card animate-pulse"
            >
              <div className="w-[96px] h-[96px] bg-muted rounded-sm shrink-0" />
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="h-3 bg-muted rounded w-12 mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                <div className="h-3 bg-muted rounded w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </PagePanel>
    </div>
  );
}
