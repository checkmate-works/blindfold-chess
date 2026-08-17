import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { resolveNativeAds } from '@/lib/ads/ad';
import { FEED_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { getOptionalUser } from '@/lib/auth';

import { FeedClient } from '@/app/[locale]/(public)/(home)/_components/FeedClient';
import { TOPICS_FEED_ENTITY_TYPES, getFeedData } from '@/app/[locale]/(public)/(home)/_lib/queries';
import { PageLayout, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { CATALOG_MIN_CARDS_FOR_MID_AD } from '@/app/[locale]/_components/AdSense/mid-ad-threshold';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { TopicCardSkeleton } from './_components/TopicCardSkeleton';
import { TopicTabs } from './_components/TopicTabs';
import { TopicTabsSkeleton } from './_components/TopicTabsSkeleton';

/**
 * Topics List (トピック一覧)
 *
 * @description
 * Landing page for discussion topics. A compact tab row navigates between the
 * recent feed (this page) and the per-category catalogs (squares / openings /
 * chunks); below it is a chronological feed of recent topic activity. The feed
 * reuses the home timeline machinery scoped to `TOPICS_FEED_ENTITY_TYPES` —
 * square/opening top-level posts and chunk entities — so a freshly
 * created/published chunk appears alongside discussion posts. Practice-scoped
 * entities (positions, rank updates) are excluded.
 *
 * @flow
 * - Tabs: Recent (active, this page) | Squares | Openings | Chunks (navigate away)
 * - Recent feed: SSR'd initial items + cursor-based infinite scroll (FeedClient)
 */
export const dynamic = 'force-dynamic';

const INITIAL_FEED_SIZE = 10;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.topics', path: 'topics' });
}

async function TopicsContent({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'topics' });
  const tSquares = await getTranslations({ locale, namespace: 'topics.squares' });
  const tPagination = await getTranslations({ locale, namespace: 'Common.pagination' });
  const user = await getOptionalUser();

  const [initialFeed, { showAds, creatives: nativeAdCreatives }] = await Promise.all([
    getFeedData({
      limit: INITIAL_FEED_SIZE,
      currentUserId: user?.id,
      entityTypes: TOPICS_FEED_ENTITY_TYPES,
    }),
    resolveNativeAds(FEED_NATIVE_AD_SLOT, user?.id ?? null),
  ]);

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <SectionTitle>{t('recentPosts')}</SectionTitle>

      <div className="mb-6">
        <TopicTabs active="recent" locale={locale} />
      </div>

      {initialFeed.items.length >= CATALOG_MIN_CARDS_FOR_MID_AD && <AdSlot slot="content-middle" />}

      {initialFeed.items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('noRecentPosts')}</p>
      ) : (
        <FeedClient
          initialItems={initialFeed.items}
          initialCursor={initialFeed.nextCursor}
          locale={locale}
          showMoreLabel={t('showMore')}
          loadMoreLabel={tPagination('loadMore')}
          justNowLabel={tSquares('justNow')}
          showAds={showAds}
          nativeAdCreatives={nativeAdCreatives}
          scope="topics"
          variant="card"
        />
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}

/**
 * Mirrors `TopicsContent`'s resolved DOM (PageTitle → SectionTitle →
 * TopicTabs → card-variant feed) to minimise CLS when the real content
 * swaps in.
 */
async function TopicsSkeleton({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'topics' });

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

/**
 * Deliberately NOT a segment-level `loading.tsx`. A `loading.tsx` file here
 * would wrap this whole subtree (including `/topics/openings/[slug]` and
 * `/topics/squares/[square]` several levels down) in a `<Suspense>`
 * boundary, so navigating straight into a deep topic post (e.g. from the
 * home feed's `TopicPostCard`) would flash this list-page skeleton before
 * the detail page's own skeleton mounted. Scoping the boundary inside this
 * page's own JSX means it only exists in the render tree when this exact
 * route is the matched leaf.
 */
export default async function TopicsPage({ params }: Props) {
  const { locale } = await params;
  return (
    <Suspense fallback={<TopicsSkeleton locale={locale} />}>
      <TopicsContent params={params} />
    </Suspense>
  );
}
