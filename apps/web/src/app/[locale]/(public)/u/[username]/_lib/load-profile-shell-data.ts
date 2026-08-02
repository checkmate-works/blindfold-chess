import { and, count, eq, isNull } from 'drizzle-orm';

import { db, profiles, userFollows } from '@/lib/db';
import { type UserAchievementGroup, getUserAchievementGroups } from '@/lib/db/achievement-queries';
import { countGamesByAuthorId } from '@/lib/db/games-read';
import { hasBlocked } from '@/lib/moderation/block';
import { countPositions } from '@/lib/positions/queries';

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
};

/**
 * Loads everything the profile "shell" needs regardless of which top-level
 * tab (topics/problems/games) is active: follow relationship, follower/
 * following counts, the tab-badge counts, and achievements. Shared by the
 * main profile page and the `/problems/{puzzles,position-memory}` pages so
 * the header, stats, and tab bar stay identical across all of them.
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
    .innerJoin(profiles, eq(userFollows.followerId, profiles.id))
    .where(and(eq(userFollows.followingId, profileId), isNull(profiles.deletedAt)));

  const followingCountPromise = isOwnProfile
    ? db
        .select({ count: count() })
        .from(userFollows)
        .innerJoin(profiles, eq(userFollows.followingId, profiles.id))
        .where(and(eq(userFollows.followerId, profileId), isNull(profiles.deletedAt)))
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
  };
}
