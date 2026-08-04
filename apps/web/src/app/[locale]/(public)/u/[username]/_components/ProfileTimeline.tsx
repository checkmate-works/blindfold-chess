import { getTranslations } from 'next-intl/server';

import { FeedClient } from '@/app/[locale]/(public)/(home)/_components/FeedClient';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getProfileFeed } from '../_actions/getProfileFeed';
import { loadProfileTimelinePage } from '../_lib/load-profile-timeline-page';
import { ProfileTimelineEmpty } from './ProfileTimelineEmpty';

/** Items rendered server-side for SEO before the client takes over scrolling. */
const INITIAL_FEED_SIZE = 10;

type Props = {
  profileId: string;
  username: string;
  locale: Locale;
  /** The viewer, for `likedByMe` and other per-viewer meta. */
  currentUserId: string | undefined;
};

/**
 * The profile's activity list: first page fetched here, further pages fetched
 * by the client through a bound {@link getProfileFeed}.
 *
 * @design Owns its own query so it can suspend
 * The feed read lives here rather than in the page's loader so the page can
 * wrap this in `<Suspense>` and stream the identity header, rank band and tab
 * row immediately — the shell is the same on all four profile pages, so it
 * should not wait on the one page's feed.
 */
export async function ProfileTimeline({ profileId, username, locale, currentUserId }: Props) {
  const [feed, tTopics, tSquares, tPagination] = await Promise.all([
    loadProfileTimelinePage({
      profileId,
      currentUserId,
      limit: INITIAL_FEED_SIZE,
    }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'topics.squares' }),
    getTranslations({ locale, namespace: 'Common.pagination' }),
  ]);

  // Only a page with nothing left behind it is genuinely empty. A page that
  // rendered nothing but still carries a cursor is a run of feed rows whose
  // entities are gone (see `loadProfileTimelinePage`); handing it to
  // `FeedClient` lets the client keep paging, whereas the empty state would
  // throw that cursor away and hide every older item the member still has.
  if (feed.items.length === 0 && feed.nextCursor === null) {
    return <ProfileTimelineEmpty username={username} locale={locale} />;
  }

  return (
    <FeedClient
      initialItems={feed.items}
      initialCursor={feed.nextCursor}
      locale={locale}
      showMoreLabel={tTopics('showMore')}
      loadMoreLabel={tPagination('loadMore')}
      justNowLabel={tSquares('justNow')}
      // Bound server-side, so the client only ever supplies the cursor — the
      // actor it pages within is not a parameter it can choose.
      fetchPage={getProfileFeed.bind(null, profileId)}
    />
  );
}
