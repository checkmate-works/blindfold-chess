import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { FaTachometerAlt } from 'react-icons/fa';

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
 * Home Page (ホーム — `/[locale]`)
 *
 * @description
 * The locale-prefixed home page (e.g. `/en`, `/ja`). Distinct from the root
 * dashboard (`/`). Displays a VS AI game section and a timeline feed of topic
 * posts with cursor-based infinite scrolling. Initial data is fetched
 * server-side for SEO; additional pages are loaded client-side via Server Action.
 *
 * @flow
 * - VS AI section: Resume or start a new AI game (VsAiCard)
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
  const tHeader = await getTranslations({ locale, namespace: 'Header' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Always prefetch ad banners in parallel to eliminate waterfall.
  // getAdBannersForFeed is wrapped with unstable_cache (60s TTL),
  // so the cost of calling it even when showAds=false is negligible.
  const [initialFeed, showAds, adBannersAll] = await Promise.all([
    getFeedData(undefined, INITIAL_FEED_SIZE, user?.id),
    shouldShowAdsForUser(user?.id ?? null),
    getAdBannersForFeed(),
  ]);

  const adBanners = showAds ? adBannersAll : [];

  return (
    <>
      <div className="mb-8 flex items-center justify-center gap-2">
        <PageTitle className="!mb-0">{tHome('pageTitle')}</PageTitle>
        {user && (
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={tHeader('dashboard')}
          >
            <FaTachometerAlt className="h-5 w-5" />
          </Link>
        )}
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
