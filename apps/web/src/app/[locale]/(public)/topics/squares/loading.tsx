/**
 * Squares index loading skeleton.
 *
 * Mirrors page.tsx (PageTitle → squares.subtitle SectionTitle → TopicTabs →
 * recent-posts list) to minimise CLS. The board section sits below the fold,
 * so the skeleton focuses on the lead recent-posts feed.
 */
import { getLocale, getTranslations } from 'next-intl/server';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

import { TopicCardSkeleton } from '../_components/TopicCardSkeleton';
import { TopicTabsSkeleton } from '../_components/TopicTabsSkeleton';

export default async function SquaresLoading() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'topics' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('squares.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('squares.subtitle')}</SectionTitle>

        <div className="mb-6">
          <TopicTabsSkeleton />
        </div>

        <SectionTitle>{t('squares.recentPosts')}</SectionTitle>
        <TopicCardSkeleton thumbnail={false} />
      </PagePanel>
    </div>
  );
}
