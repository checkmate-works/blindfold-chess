/**
 * Chunks catalog loading skeleton.
 *
 * Mirrors page.tsx (PageTitle → listSubtitle SectionTitle → TopicTabs →
 * filter chips → CatalogListCard list) to minimise CLS.
 */
import { getLocale, getTranslations } from 'next-intl/server';

import { TopicCardSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicCardSkeleton';
import { TopicTabsSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicTabsSkeleton';
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

export default async function ChunksLoading() {
  // Resolve the request locale explicitly: in a `loading.tsx` the bare
  // `getTranslations()` falls back to the default locale (the page's
  // `setRequestLocale` hasn't run yet while suspended), which would render the
  // title / subtitle in English on a `ja` page.
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'chunks' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('listTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('listSubtitle')}</SectionTitle>

        <div className="mb-6">
          <TopicTabsSkeleton />
        </div>

        {/* Filter chips (all / drafts / published) */}
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-muted" />
          ))}
        </div>

        <TopicCardSkeleton />
      </PagePanel>
    </div>
  );
}
