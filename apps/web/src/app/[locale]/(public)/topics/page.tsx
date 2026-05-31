import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { IS_LOCAL_DEV } from '@/config';

import { shouldShowAdsForUser } from '@/lib/ads/ad';
import { createClient } from '@/lib/supabase/server';

import { FeedClient } from '@/app/[locale]/(public)/(home)/_components/FeedClient';
import { TOPICS_FEED_ENTITY_TYPES, getFeedData } from '@/app/[locale]/(public)/(home)/_lib/queries';
import { CardLink, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

/**
 * Topics List (トピック一覧)
 *
 * @description
 * Landing page for discussion topics. Surfaces a "Category" navigation block
 * (squares / openings / chunks) plus a chronological feed of recent topic
 * activity. The feed reuses the home timeline machinery scoped to
 * `TOPICS_FEED_ENTITY_TYPES` — square/opening top-level posts and chunk
 * entities — so a freshly created/published chunk appears alongside discussion
 * posts. Practice-scoped entities (positions, rank updates) are excluded.
 *
 * @flow
 * - Category: links to the squares / openings / chunks catalogs
 * - Recent feed: SSR'd initial items + cursor-based infinite scroll (FeedClient)
 */
export const dynamic = 'force-dynamic';

const INITIAL_FEED_SIZE = 10;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.topics', path: 'topics' });
}

export default async function TopicsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'topics' });
  const tSquares = await getTranslations({ locale, namespace: 'topics.squares' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [initialFeed, showAdsResult] = await Promise.all([
    getFeedData(undefined, INITIAL_FEED_SIZE, user?.id, TOPICS_FEED_ENTITY_TYPES),
    shouldShowAdsForUser(user?.id ?? null),
  ]);
  const showAds = IS_LOCAL_DEV || showAdsResult;

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <SectionTitle>Category</SectionTitle>
      <div className="space-y-4">
        <CardLink
          href="/topics/squares"
          icon="♟"
          title={t('categories.squares.title')}
          description={t('categories.squares.description')}
          locale={locale}
        />
        <CardLink
          href="/topics/openings"
          icon="♞"
          title={t('categories.openings.title')}
          description={t('categories.openings.description')}
          locale={locale}
        />
        <CardLink
          href="/chunks"
          icon="🧩"
          title={t('categories.chunks.title')}
          description={t('categories.chunks.description')}
          locale={locale}
        />
      </div>

      <SectionTitle>{t('recentPosts')}</SectionTitle>

      {initialFeed.items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('noRecentPosts')}</p>
      ) : (
        <FeedClient
          initialItems={initialFeed.items}
          initialCursor={initialFeed.nextCursor}
          locale={locale}
          showMoreLabel={t('showMore')}
          justNowLabel={tSquares('justNow')}
          showAds={showAds}
          scope="topics"
          variant="card"
        />
      )}
    </PageLayout>
  );
}
