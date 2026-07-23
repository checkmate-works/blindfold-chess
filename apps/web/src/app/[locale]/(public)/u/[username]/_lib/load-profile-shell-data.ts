import { and, count, eq, isNull } from 'drizzle-orm';

import { db, profiles, userFollows } from '@/lib/db';
import { type UserAchievementRow, getUserAchievements } from '@/lib/db/achievement-queries';
import { countGamesByAuthorId } from '@/lib/db/games-read';
import { hasBlocked } from '@/lib/moderation/block';
import { countPositions } from '@/lib/positions/queries';

import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { getPostsByUserId } from '@/app/[locale]/(public)/topics/_lib/user-post-queries';

export type ProfileShellData = {
  initialFollowing: boolean;
  followedByProfile: boolean;
  /** Whether the current viewer has blocked this profile. */
  viewerHasBlocked: boolean;
  followerCount: number;
  followingCount: number;
  /**
   * Full post list, not just a count — there is no dedicated count query for
   * `getPostsByUserId`. The main page slices this for the topics tab;
   * `/problems/*` pages only need `allPosts.length` for the tab badge.
   */
  allPosts: ProfilePostWithReplyMeta[];
  problemsCount: number;
  gamesCount: number;
  userAchievementRows: UserAchievementRow[];
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
    [followerResult],
    [followingResult],
    allPosts,
    userAchievementRows,
    problemsCount,
    gamesCount,
  ] = await Promise.all([
    followCheckPromise,
    reverseFollowCheckPromise,
    viewerHasBlockedPromise,
    followerCountPromise,
    followingCountPromise,
    getPostsByUserId(profileId, currentUserId),
    getUserAchievements(profileId),
    countPositions({ userId: profileId }),
    countGamesByAuthorId(profileId),
  ]);

  return {
    initialFollowing: !!existingFollowRows[0],
    followedByProfile: !!reverseFollowRows[0],
    viewerHasBlocked,
    followerCount: followerResult.count,
    followingCount: followingResult.count,
    allPosts,
    problemsCount,
    gamesCount,
    userAchievementRows,
  };
}
