import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAdBannersForFeed, shouldShowAdsForUser } from '@/lib/ad';
import { JsonLd, generateWebApplicationSchema } from '@/lib/jsonld';
import { createClient } from '@/lib/supabase/server';

import { DashboardCard, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FeedClient } from './_components/FeedClient';
import { VsAiCard } from './_components/VsAiCard';
import { getFeedData } from './_lib/queries';

/**
 * Home Page (ホーム)
 *
 * @description
 * The main landing page. Displays a timeline feed of topic posts with
 * cursor-based infinite scrolling. Initial data is fetched server-side
 * for SEO; additional pages are loaded client-side via Server Action.
 *
 * @flow
 * - Timeline Feed: Chronological feed of topic posts across all topic types
 * - Infinite scroll: Loads more items when the user scrolls near the bottom
 */
export const dynamic = 'force-dynamic';

const INITIAL_FEED_SIZE = 10;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });

  return {
    ...generateCanonicalMetadata({ locale, path: '' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });
  const tHome = await getTranslations({ locale, namespace: 'home' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });
  const tSquares = await getTranslations({ locale, namespace: 'topics.squares' });
  const tCommon = await getTranslations({ locale, namespace: 'Common' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [initialFeed, showAds] = await Promise.all([
    getFeedData(undefined, INITIAL_FEED_SIZE, user?.id),
    shouldShowAdsForUser(user?.id ?? null),
  ]);

  const adBanners = showAds ? await getAdBannersForFeed() : [];

  return (
    <>
      <div className="mb-8">
        <PageTitle>{tHome('pageTitle')}</PageTitle>
      </div>

      <div className="space-y-6">
        <JsonLd data={generateWebApplicationSchema(locale, tMetadata('siteName'))} />

        <DashboardCard>
          <VsAiCard locale={locale} />
          <FeedClient
            initialItems={initialFeed.items}
            initialCursor={initialFeed.nextCursor}
            locale={locale}
            showMoreLabel={tTopics('showMore')}
            justNowLabel={tSquares('justNow')}
            newReplyTemplate={tSquares('newReply', { time: '{time}' })}
            adBanners={adBanners}
            adLabel={tCommon('adLabel')}
            sponsorLabel={tCommon('sponsor')}
            sponsoredLinkLabel={tCommon('sponsoredLink')}
          />
        </DashboardCard>
      </div>
    </>
  );
}
