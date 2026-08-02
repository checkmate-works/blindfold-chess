import type { RankSlug } from '@/lib/db/data/ranks';

import { getFeedData } from '@/app/[locale]/(public)/(home)/_lib/queries';
import type { FeedResponse } from '@/app/[locale]/(public)/(home)/_lib/types';
import { getAchievedSlugsForUser } from '@/app/[locale]/(public)/dojo/ranks/_lib/queries';
import { resolveHighestAchievedSlug } from '@/app/[locale]/(public)/dojo/ranks/_lib/rank-progression';

import { type ProfileShellData, loadProfileShellData } from './load-profile-shell-data';
import { type ProfileFeedFilter, resolveProfileFeedEntityTypes } from './profile-feed-filters';

/** Items rendered server-side for SEO before the client takes over scrolling. */
const INITIAL_FEED_SIZE = 10;

export type PublicProfilePageData = ProfileShellData & {
  /** Highest rank actually held; `null` for an unranked (mukyu) member. */
  rankSlug: RankSlug | null;
  /** First page of the timeline, matching `filter`. */
  feed: FeedResponse;
};

/**
 * Server-side inputs for the profile timeline: the shared shell, the member's
 * belt rank, and the first page of their activity.
 *
 * The rank lookup lives here rather than in {@link loadProfileShellData}
 * because only this page renders it — the archive pages share the shell and
 * would otherwise pay for two queries they never use.
 *
 * The feed is fetched even for a blocked viewer, whose page discards it in
 * favour of the block notice. Skipping it would mean threading the block
 * decision in ahead of the shell that produces it, to save one indexed read
 * on a path almost nobody takes.
 */
export async function loadPublicProfilePageData({
  profileId,
  currentUserId,
  isOwnProfile,
  filter,
}: {
  profileId: string;
  currentUserId: string | undefined;
  isOwnProfile: boolean;
  filter: ProfileFeedFilter;
}): Promise<PublicProfilePageData> {
  const [shell, achievedSlugs, feed] = await Promise.all([
    loadProfileShellData({ profileId, currentUserId, isOwnProfile }),
    getAchievedSlugsForUser(profileId),
    getFeedData({
      limit: INITIAL_FEED_SIZE,
      currentUserId,
      entityTypes: resolveProfileFeedEntityTypes(filter),
      actorId: profileId,
    }),
  ]);

  return {
    ...shell,
    rankSlug: resolveHighestAchievedSlug(achievedSlugs),
    feed,
  };
}
