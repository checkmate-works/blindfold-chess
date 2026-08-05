import { and, count, eq } from 'drizzle-orm';

import { db, userFollows } from '@/lib/db';
import { type UserAchievementGroup, getUserAchievementGroups } from '@/lib/db/achievement-queries';
import type { RankSlug } from '@/lib/db/data/ranks';
import { countGamesByAuthorId } from '@/lib/db/games-read';
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

  const followerCountPromise = db
    .select({ count: count() })
    .from(userFollows)
    .where(and(eq(userFollows.followingId, profileId), profileNotDeleted(userFollows.followerId)));

  const followingCountPromise = isOwnProfile
    ? db
        .select({ count: count() })
        .from(userFollows)
        .where(
          and(eq(userFollows.followerId, profileId), profileNotDeleted(userFollows.followingId))
        )
    : Promise.resolve([{ count: 0 }]);

  const [
    existingFollowRows,
    reverseFollowRows,
    viewerHasBlocked,
    blockedByProfile,
    [followerResult],
    [followingResult],
    postsCount,
    userAchievementGroups,
    problemsCount,
    gamesCount,
    achievedSlugs,
  ] = await Promise.all([
    followCheckPromise,
    reverseFollowCheckPromise,
    viewerHasBlockedPromise,
    blockedByProfilePromise,
    followerCountPromise,
    followingCountPromise,
    getPostCountByUserId(profileId),
    getUserAchievementGroups(profileId),
    countPositions({ userId: profileId }),
    countGamesByAuthorId(profileId),
    getAchievedSlugsForUser(profileId),
  ]);

  return {
    initialFollowing: !!existingFollowRows[0],
    followedByProfile: !!reverseFollowRows[0],
    viewerHasBlocked,
    blockedByProfile,
    followerCount: followerResult.count,
    followingCount: followingResult.count,
    postsCount,
    problemsCount,
    gamesCount,
    userAchievementGroups,
    rankSlug: resolveHighestAchievedSlug(achievedSlugs),
  };
}
