import { unstable_cache } from 'next/cache';

import { and, eq } from 'drizzle-orm';

import { db, userFollows } from '@/lib/db';
import { type UserAchievementGroup, getUserAchievementGroups } from '@/lib/db/achievement-queries';
import type { RankSlug } from '@/lib/db/data/ranks';
import { countGamesByAuthorId } from '@/lib/db/games-read';
import { countRows } from '@/lib/db/list-query';
import { profileNotDeleted } from '@/lib/db/profile-not-deleted';
import { hasBlocked } from '@/lib/moderation/block';
import { countPositions } from '@/lib/positions/queries';

import { getAchievedSlugsForUser } from '@/app/[locale]/(public)/dojo/ranks/_lib/queries';
import { resolveHighestAchievedSlug } from '@/app/[locale]/(public)/dojo/ranks/_lib/rank-progression';
import { getPostCountByUserId } from '@/app/[locale]/(public)/topics/_lib/user-post-queries';

export type ProfileShellData = {
  initialFollowing: boolean;
  followedByProfile: boolean;
  /** Whether the current viewer has blocked this profile. */
  viewerHasBlocked: boolean;
  /** Whether this profile has blocked the current viewer. */
  blockedByProfile: boolean;
  followerCount: number;
  followingCount: number;
  /**
   * Topic-post count only. Every page that renders the shell wants the number
   * for a tab badge or a stats count; the posts archive is its own route and
   * fetches the page it needs. Loading the full list here instead meant five
   * queries and every post row (plus every reply to them) on four pages that
   * called `.length` on the result.
   */
  postsCount: number;
  problemsCount: number;
  gamesCount: number;
  /** One entry per badge definition, most recently earned first. */
  userAchievementGroups: UserAchievementGroup[];
  /** Highest rank actually held; `null` for an unranked (mukyu) member. */
  rankSlug: RankSlug | null;
};

/**
 * The parts of the shell that depend only on whose profile it is — no viewer,
 * no follow state, nothing per-request. Split out from {@link ProfileShellData}
 * because that is exactly the subset a cache entry can be keyed by profile id.
 */
type PublicProfileStats = Pick<
  ProfileShellData,
  | 'followerCount'
  | 'postsCount'
  | 'problemsCount'
  | 'gamesCount'
  | 'userAchievementGroups'
  | 'rankSlug'
>;

/**
 * The six profile-scoped aggregates, in one round.
 *
 * Every one of them is a separate pooled connection, and they are opened
 * simultaneously — this fan-out, times four locales, is what a crawler sweep
 * turns into pool pressure (see the `@design` note on
 * {@link getCachedPublicProfileStats}).
 */
async function loadPublicProfileStats(profileId: string): Promise<PublicProfileStats> {
  const [
    followerCount,
    postsCount,
    userAchievementGroups,
    problemsCount,
    gamesCount,
    achievedSlugs,
  ] = await Promise.all([
    countRows(
      userFollows,
      and(eq(userFollows.followingId, profileId), profileNotDeleted(userFollows.followerId))
    ),
    getPostCountByUserId(profileId),
    getUserAchievementGroups(profileId),
    countPositions({ userId: profileId }),
    countGamesByAuthorId(profileId),
    getAchievedSlugsForUser(profileId),
  ]);

  return {
    followerCount,
    postsCount,
    userAchievementGroups,
    problemsCount,
    gamesCount,
    rankSlug: resolveHighestAchievedSlug(achievedSlugs),
  };
}

/**
 * {@link loadPublicProfileStats} behind the Data Cache, one entry per profile.
 *
 * @design Why a plain TTL and no tags
 * These six reads are the shell's whole query fan-out, and caching them takes
 * it to zero for every viewer but the profile's owner. That is the point: the
 * `/u/[username]` archives are the pages a crawler hits hardest, and the
 * session pooler's connection budget is shared across every warm instance — a
 * sweep in four locales is what had these reads refused with
 * `EMAXCONNSESSION` (Sentry BLINDFOLD-CHESS-5H, 2026-08-22).
 *
 * Unlike the pagination COUNTs, these are not tag-invalidated. Their writers
 * are most of the app — publishing a puzzle or a game, posting a topic, being
 * followed, earning a badge, being granted a rank — so a tag would have to be
 * expired from a dozen call sites, and the one that eventually gets forgotten
 * leaves a profile stale with nothing pointing at the cause. A five-minute TTL
 * is a bounded, uniform staleness that no writer has to remember, and the one
 * viewer who would notice is handled structurally instead: the owner's own
 * view bypasses the cache (see {@link loadProfileShellData}), so "I just
 * published this, why is the count wrong" cannot happen.
 *
 * Everything here survives the JSON round-trip as itself — counts, a slug, and
 * achievement groups whose `occurrences` are already `jsonb`. A `Date` added to
 * `PublicProfileStats` would not.
 */
const getCachedPublicProfileStats = (profileId: string) =>
  unstable_cache(() => loadPublicProfileStats(profileId), ['public-profile-stats', profileId], {
    revalidate: 300,
  })();

/**
 * Loads everything the profile "shell" needs regardless of which top-level
 * tab (timeline/topics/problems/games) is active: follow relationship,
 * follower/following counts, the tab-badge counts, achievements, and the
 * member's belt rank. Shared by every page under `/u/[username]` that renders
 * the shell, so the header, stats band, and tab bar stay identical across all
 * of them.
 *
 * The rank lives here rather than only on the timeline page because the stats
 * band is now part of the shared shell — every page draws the badge, so every
 * page has to load what it shows.
 */
export async function loadProfileShellData({
  profileId,
  currentUserId,
  isOwnProfile,
}: {
  profileId: string;
  currentUserId: string | undefined;
  isOwnProfile: boolean;
}): Promise<ProfileShellData> {
  const followCheckPromise =
    currentUserId && !isOwnProfile
      ? db
          .select({ id: userFollows.id })
          .from(userFollows)
          .where(
            and(eq(userFollows.followerId, currentUserId), eq(userFollows.followingId, profileId))
          )
          .limit(1)
      : Promise.resolve([]);

  const reverseFollowCheckPromise =
    currentUserId && !isOwnProfile
      ? db
          .select({ id: userFollows.id })
          .from(userFollows)
          .where(
            and(eq(userFollows.followerId, profileId), eq(userFollows.followingId, currentUserId))
          )
          .limit(1)
      : Promise.resolve([]);

  const viewerHasBlockedPromise =
    currentUserId && !isOwnProfile ? hasBlocked(currentUserId, profileId) : Promise.resolve(false);

  const blockedByProfilePromise =
    currentUserId && !isOwnProfile ? hasBlocked(profileId, currentUserId) : Promise.resolve(false);

  const followingCountPromise = isOwnProfile
    ? countRows(
        userFollows,
        and(eq(userFollows.followerId, profileId), profileNotDeleted(userFollows.followingId))
      )
    : Promise.resolve(0);

  const [
    existingFollowRows,
    reverseFollowRows,
    viewerHasBlocked,
    blockedByProfile,
    followingCount,
    stats,
  ] = await Promise.all([
    followCheckPromise,
    reverseFollowCheckPromise,
    viewerHasBlockedPromise,
    blockedByProfilePromise,
    followingCountPromise,
    // The owner reads live, so their own page always reflects what they just
    // published; every other viewer — crawlers included — gets the cache.
    isOwnProfile ? loadPublicProfileStats(profileId) : getCachedPublicProfileStats(profileId),
  ]);

  return {
    initialFollowing: !!existingFollowRows[0],
    followedByProfile: !!reverseFollowRows[0],
    viewerHasBlocked,
    blockedByProfile,
    followingCount,
    ...stats,
  };
}
