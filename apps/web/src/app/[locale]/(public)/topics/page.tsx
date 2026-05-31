import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { IS_LOCAL_DEV } from '@/config';

import { shouldShowAdsForUser } from '@/lib/ads/ad';
import { createClient } from '@/lib/supabase/server';

import { FeedClient } from '@/app/[locale]/(public)/(home)/_components/FeedClient';
import { TOPICS_FEED_ENTITY_TYPES, getFeedData } from '@/app/[locale]/(public)/(home)/_lib/queries';
import { LinkTabs, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { LinkTabItem } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

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

  const tabs: LinkTabItem[] = [
    { value: 'recent', label: `🆕 ${t('tabs.recent')}`, href: '/topics' },
    { value: 'chunks', label: `🧠 ${t('categories.chunks.title')}`, href: '/chunks' },
    { value: 'openings', label: `📖 ${t('categories.openings.title')}`, href: '/topics/openings' },
    { value: 'squares', label: `🔳 ${t('categories.squares.title')}`, href: '/topics/squares' },
  ];

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <SectionTitle>{t('recentPosts')}</SectionTitle>

      <div className="mb-6">
        <LinkTabs items={tabs} activeValue="recent" locale={locale} aria-label={t('title')} />
      </div>

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
