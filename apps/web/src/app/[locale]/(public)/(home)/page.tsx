import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { IS_LOCAL_DEV } from '@/config';
import { FaTachometerAlt } from 'react-icons/fa';

import { shouldShowAdsForUser } from '@/lib/ads/ad';
import { JsonLd, generateWebApplicationSchema } from '@/lib/seo/jsonld';
import { createClient } from '@/lib/supabase/server';

import { DashboardCard, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FeedClient } from './_components/FeedClient';
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
 * @design SSR + loading.tsx
 * Initial feed items (INITIAL_FEED_SIZE) are fetched on the server and passed
 * as `initialItems` to FeedClient. Although FeedClient is a Client Component,
 * Next.js renders its initial markup on the server so the HTML includes real
 * content for Googlebot. Because the page is `force-dynamic`, Next.js shows
 * `loading.tsx` as a Suspense fallback during server-side data fetching. This
 * skeleton flash is intentional — the alternative (no loading.tsx) would keep
 * the previous page visible during navigation, which is a worse UX. The
 * loading skeleton does NOT affect SEO; Googlebot waits for the final streamed
 * HTML.
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

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: '', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const [tMetadata, tHome, tTopics, tSquares, tHeader, supabase] = await Promise.all([
    getTranslations({ locale, namespace: 'metadata' }),
    getTranslations({ locale, namespace: 'home' }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'topics.squares' }),
    getTranslations({ locale, namespace: 'Header' }),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [initialFeed, showAdsResult] = await Promise.all([
    getFeedData(undefined, INITIAL_FEED_SIZE, user?.id),
    shouldShowAdsForUser(user?.id ?? null),
  ]);
  const showAds = IS_LOCAL_DEV || showAdsResult;

  return (
    <>
      <div className="mb-8 flex items-center justify-center gap-2">
        <PageTitle>{tHome('pageTitle')}</PageTitle>
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
        <JsonLd
          data={generateWebApplicationSchema(
            tMetadata('siteName'),
            tMetadata('webApplicationDescription')
          )}
        />

        <DashboardCard>
          <VsAiCard locale={locale} />
          {/* initialItems: SSR'd into FeedClient — see FeedClient prop TSDoc for the SSR invariant. */}
          <FeedClient
            initialItems={initialFeed.items}
            initialCursor={initialFeed.nextCursor}
            locale={locale}
            showMoreLabel={tTopics('showMore')}
            justNowLabel={tSquares('justNow')}
            newReplyTemplate={tSquares('newReply', { time: '{time}' })}
            showAds={showAds}
          />
        </DashboardCard>
      </div>
    </>
  );
}
