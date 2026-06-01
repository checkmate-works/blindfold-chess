/**
 * Topics index loading skeleton.
 *
 * Mirrors page.tsx (PageTitle → SectionTitle → TopicTabs → card-variant feed)
 * to minimise CLS when the real content swaps in.
 */
import { getTranslations } from 'next-intl/server';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

import { TopicCardSkeleton } from './_components/TopicCardSkeleton';
import { TopicTabsSkeleton } from './_components/TopicTabsSkeleton';

export default async function TopicsLoading() {
  const t = await getTranslations('topics');

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('recentPosts')}</SectionTitle>

        <div className="mb-6">
          <TopicTabsSkeleton />
        </div>

        <TopicCardSkeleton />
      </PagePanel>
    </div>
  );
}
