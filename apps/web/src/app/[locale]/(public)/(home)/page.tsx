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
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { JsonLd, generateWebApplicationSchema } from '@/lib/jsonld';
import { createClient } from '@/lib/supabase/server';

import { PageTitle } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FeedClient } from './_components/FeedClient';
import { getFeedData } from './_lib/queries';

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialFeed = await getFeedData(undefined, INITIAL_FEED_SIZE, user?.id);

  return (
    <>
      <div className="mb-8">
        <PageTitle>{tHome('pageTitle')}</PageTitle>
      </div>

      <div className="space-y-6">
        <JsonLd data={generateWebApplicationSchema(locale, tMetadata('siteName'))} />

        <AdBanner slot="banner-wide" locale={locale} />

        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <FeedClient
            initialItems={initialFeed.items}
            initialCursor={initialFeed.nextCursor}
            locale={locale}
            showMoreLabel={tTopics('showMore')}
            justNowLabel={tSquares('justNow')}
            newReplyTemplate={tSquares('newReply', { time: '{time}' })}
            noItemsLabel={tHome('feed.noItems')}
          />
        </div>
      </div>
    </>
  );
}
