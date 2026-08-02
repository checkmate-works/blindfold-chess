import { getTranslations } from 'next-intl/server';

import { FeedClient } from '@/app/[locale]/(public)/(home)/_components/FeedClient';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getProfileFeed } from '../_actions/getProfileFeed';
import { loadProfileTimelinePage } from '../_lib/load-profile-timeline-page';
import { type ProfileFeedFilter } from '../_lib/profile-feed-filters';
import { ProfileTimelineEmpty } from './ProfileTimelineEmpty';

/** Items rendered server-side for SEO before the client takes over scrolling. */
const INITIAL_FEED_SIZE = 10;

type Props = {
  profileId: string;
  username: string;
  locale: Locale;
  /** The viewer, for `likedByMe` and other per-viewer meta. */
  currentUserId: string | undefined;
  filter: ProfileFeedFilter;
};

/**
 * The profile's activity list: first page fetched here, further pages fetched
 * by the client through a bound {@link getProfileFeed}.
 *
 * @design Owns its own query so it can suspend
 * The feed read lives here rather than in the page's loader so the page can
 * wrap this in `<Suspense>` and stream the identity header, stats band and
 * filter chips immediately — switching filters then swaps a skeleton for the
 * new list instead of leaving the previous list on screen with no feedback.
 *
 * @design The Suspense boundary must be keyed by filter
 * `FeedClient` seeds its list from `initialItems` once (see that prop's
 * TSDoc). Client-side navigation between `?filter=` values keeps the same
 * component mounted, so without a remount the new items are fetched and then
 * silently discarded — the timeline keeps rendering the previous filter's
 * cards while the chips show the new selection. Reproduced 2026-08-02 by
 * clicking the Games chip: the list stayed on chunks/positions indefinitely.
 * The `key` on the boundary in `page.tsx` is what forces the remount.
 */
export async function ProfileTimeline({
  profileId,
  username,
  locale,
  currentUserId,
  filter,
}: Props) {
  const [feed, tTopics, tSquares] = await Promise.all([
    loadProfileTimelinePage({
      profileId,
      filter,
      currentUserId,
      limit: INITIAL_FEED_SIZE,
    }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'topics.squares' }),
  ]);

  // Only a page with nothing left behind it is genuinely empty. A page that
  // rendered nothing but still carries a cursor is a run of feed rows whose
  // entities are gone (see `loadProfileTimelinePage`); handing it to
  // `FeedClient` lets the client keep paging, whereas the empty state would
  // throw that cursor away and hide every older item the member still has.
  if (feed.items.length === 0 && feed.nextCursor === null) {
    return <ProfileTimelineEmpty username={username} locale={locale} filter={filter} />;
  }

  return (
    <FeedClient
      initialItems={feed.items}
      initialCursor={feed.nextCursor}
      locale={locale}
      showMoreLabel={tTopics('showMore')}
      justNowLabel={tSquares('justNow')}
      // Bound server-side, so the client only ever supplies the cursor — the
      // actor and filter it pages within are not parameters it can choose.
      fetchPage={getProfileFeed.bind(null, profileId, filter)}
    />
  );
}
