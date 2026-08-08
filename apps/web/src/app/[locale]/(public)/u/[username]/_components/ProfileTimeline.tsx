import { getTranslations } from 'next-intl/server';

import { FeedClient } from '@/app/[locale]/(public)/(home)/_components/FeedClient';
import { getFeedData } from '@/app/[locale]/(public)/(home)/_lib/queries';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getProfileFeed } from '../_actions/getProfileFeed';
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
    getFeedData({
      actorId: profileId,
      currentUserId,
      limit: INITIAL_FEED_SIZE,
    }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'topics.squares' }),
    getTranslations({ locale, namespace: 'Common.pagination' }),
  ]);

  // `getFeedData` filters unrenderable rows in SQL, so an empty page normally
  // means an exhausted one. The cursor is still checked: an entity deleted
  // between that query and its loader can leave a short page behind a live
  // cursor, and handing that to `FeedClient` lets the client page on, whereas
  // the empty state would throw the cursor away and hide everything older.
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
