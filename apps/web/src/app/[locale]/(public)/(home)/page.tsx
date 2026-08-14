import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { resolveNativeAds } from '@/lib/ads/ad';
import { FEED_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { getOptionalUser } from '@/lib/auth';
import { JsonLd, generateWebApplicationSchema } from '@/lib/seo/jsonld';

import { DashboardCard, HelpTourButton, PageTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FeedClient } from './_components/FeedClient';
import { FeedSkeleton } from './_components/FeedSkeleton';
import { VsAiCard } from './_components/VsAiCard';
import { getFeedData } from './_lib/queries';

/**
 * Home Page (`/[locale]`)
 *
 * @description
 * The locale-prefixed home page (e.g. `/en`, `/ja`). Distinct from the root
 * dashboard (`/`). Displays a VS AI game section and a timeline feed of topic
 * posts with cursor-based infinite scrolling. Initial feed items are rendered
 * server-side (SSR) for SEO; additional pages are loaded client-side via
 * Server Action.
 *
 * @flow
 * - VS AI section: Resume or start a new AI game (VsAiCard)
 * - Timeline Feed: Chronological feed of topic posts across all topic types
 * - Infinite scroll: Loads more items when the user scrolls near the bottom
 *
 * @design SSR + streaming
 * The page shell (title, JSON-LD, VsAiCard — a client component fed from
 * localStorage that needs zero server data) renders as soon as translations
 * resolve. The feed — the slow part: auth + feed query + ad-entitlement
 * check — lives in the async `HomeFeed` child behind `<Suspense>`, so the
 * "Resume game" card paints without waiting on it. `loading.tsx` still
 * covers the whole route during navigation; this boundary is what lets the
 * shell replace it early instead of arriving together with the feed.
 *
 * Initial feed items (INITIAL_FEED_SIZE) are fetched on the server and passed
 * as `initialItems` to FeedClient. Although FeedClient is a Client Component,
 * Next.js renders its initial markup on the server so the HTML includes real
 * content for Googlebot; streaming does not change that — Googlebot waits for
 * the final streamed HTML, not the Suspense fallback.
 */
export const dynamic = 'force-dynamic';

const INITIAL_FEED_SIZE = 10;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.home', path: '' });
}

async function HomeFeed({ locale }: { locale: Locale }) {
  const user = await getOptionalUser();
  const [initialFeed, { showAds, creatives: nativeAdCreatives }, tTopics, tSquares, tPagination] =
    await Promise.all([
      getFeedData({ limit: INITIAL_FEED_SIZE, currentUserId: user?.id }),
      resolveNativeAds(FEED_NATIVE_AD_SLOT, user?.id ?? null),
      getTranslations({ locale, namespace: 'topics' }),
      getTranslations({ locale, namespace: 'topics.squares' }),
      getTranslations({ locale, namespace: 'Common.pagination' }),
    ]);

  return (
    /* initialItems: SSR'd into FeedClient — see FeedClient prop TSDoc for the SSR invariant. */
    <FeedClient
      initialItems={initialFeed.items}
      initialCursor={initialFeed.nextCursor}
      locale={locale}
      showMoreLabel={tTopics('showMore')}
      loadMoreLabel={tPagination('loadMore')}
      justNowLabel={tSquares('justNow')}
      showAds={showAds}
      nativeAdCreatives={nativeAdCreatives}
      data-tour-id="home-feed"
    />
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const [tMetadata, tHome] = await Promise.all([
    getTranslations({ locale, namespace: 'metadata' }),
    getTranslations({ locale, namespace: 'home' }),
  ]);

  const helpSteps: HelpStep[] = [
    {
      targetId: 'vs-ai-card',
      title: tHome('help.vsAi.title'),
      description: tHome('help.vsAi.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      targetId: 'home-feed',
      title: tHome('help.feed.title'),
      description: tHome('help.feed.description'),
      side: 'top',
      align: 'start',
    },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-center gap-2">
        <PageTitle>{tHome('pageTitle')}</PageTitle>
        <HelpTourButton steps={helpSteps} label={tHome('help.label')} />
      </div>

      <div className="space-y-6">
        <JsonLd
          data={generateWebApplicationSchema(
            tMetadata('siteName'),
            tMetadata('webApplicationDescription')
          )}
        />

        <DashboardCard>
          <VsAiCard locale={locale} data-tour-id="vs-ai-card" />
          <Suspense fallback={<FeedSkeleton count={5} />}>
            <HomeFeed locale={locale} />
          </Suspense>
        </DashboardCard>
      </div>
    </>
  );
}
