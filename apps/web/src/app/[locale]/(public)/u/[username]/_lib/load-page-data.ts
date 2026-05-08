import { and, count, eq, isNull } from 'drizzle-orm';

import { db, profiles, userFollows } from '@/lib/db';
import { type UserAchievementRow, getUserAchievements } from '@/lib/db/achievement-queries';
import { type ReplyMeta, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { type PositionLikeMeta, getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { countPositions, listPositions } from '@/lib/positions/queries';

import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { getPostsByUserId } from '@/app/[locale]/(public)/topics/_lib/user-post-queries';

export type ProfileTab = 'topics' | 'problems';

type ListedPosition = Awaited<ReturnType<typeof listPositions>>[number];

export type PublicProfilePageData = {
  activeTab: ProfileTab;
  initialFollowing: boolean;
  followedByProfile: boolean;
  followerCount: number;
  followingCount: number;
  posts: ProfilePostWithReplyMeta[];
  topicsCount: number;
  topicsCurrentPage: number;
  topicsTotalPages: number;
  problemPositions: ListedPosition[];
  problemsCount: number;
  problemsCurrentPage: number;
  problemsTotalPages: number;
  problemLikeMetaMap: Map<string, PositionLikeMeta>;
  problemReplyMetaMap: Map<string, ReplyMeta>;
  userAchievementRows: UserAchievementRow[];
};

/**
 * Load every server-side input the public profile page needs to render,
 * with the queries for each tab fanned out in parallel.
 *
 * Phase 1 fans out: follow checks, follower / following counts, top-level
 * posts (which double as the topics-tab list), achievements, and the
 * problems-tab count. Phase 2 loads the problems-tab slice + its like /
 * reply metadata only when that tab is active, since those queries need
 * the post-pagination math from Phase 1.
 *
 * The follow check / following-count promises short-circuit to empty
 * results when they are not applicable (e.g., anonymous viewer, viewing
 * own profile), keeping a single Promise.all-based shape.
 */
export async function loadPublicProfilePageData({
  profileId,
  currentUserId,
  isOwnProfile,
  parsedParams,
  pageSize,
}: {
  profileId: string;
  currentUserId: string | undefined;
  isOwnProfile: boolean;
  parsedParams: { page: number; tab: string };
  pageSize: number;
}): Promise<PublicProfilePageData> {
  const activeTab: ProfileTab = parsedParams.tab === 'problems' ? 'problems' : 'topics';

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
    [followerResult],
    [followingResult],
    allPosts,
    userAchievementRows,
    problemsCount,
  ] = await Promise.all([
    followCheckPromise,
    reverseFollowCheckPromise,
    followerCountPromise,
    followingCountPromise,
    getPostsByUserId(profileId, currentUserId),
    getUserAchievements(profileId),
    countPositions({ userId: profileId }),
  ]);

  const topicsCount = allPosts.length;
  const topicsTotalPages = Math.ceil(topicsCount / pageSize);
  const topicsCurrentPage =
    activeTab === 'topics' ? Math.max(1, Math.min(parsedParams.page, topicsTotalPages || 1)) : 1;
  const posts = allPosts.slice((topicsCurrentPage - 1) * pageSize, topicsCurrentPage * pageSize);

  const problemsTotalPages = Math.ceil(problemsCount / pageSize);
  const problemsCurrentPage =
    activeTab === 'problems'
      ? Math.max(1, Math.min(parsedParams.page, problemsTotalPages || 1))
      : 1;

  let problemPositions: ListedPosition[] = [];
  let problemLikeMetaMap: Map<string, PositionLikeMeta> = new Map();
  let problemReplyMetaMap: Map<string, ReplyMeta> = new Map();

  if (activeTab === 'problems') {
    problemPositions = await listPositions({
      userId: profileId,
      limit: pageSize,
      offset: (problemsCurrentPage - 1) * pageSize,
    });

    // Reply meta is keyed by `(topicType, topicKey)`. Position IDs are unique
    // across types, so we can fetch puzzle + memory reply meta in parallel and
    // merge into a single Map<positionId, ReplyMeta>.
    const puzzleIds = problemPositions.filter((p) => p.type === 'puzzle').map((p) => p.id);
    const memoryIds = problemPositions.filter((p) => p.type === 'memory').map((p) => p.id);

    const [likeMetaMap, puzzleReplyMetaMap, memoryReplyMetaMap] = await Promise.all([
      getPositionLikeMetaMap(
        problemPositions.map((p) => p.id),
        currentUserId
      ),
      getReplyMetaMap('position_puzzle', puzzleIds),
      getReplyMetaMap('position_memory', memoryIds),
    ]);

    problemLikeMetaMap = likeMetaMap;
    problemReplyMetaMap = new Map([...puzzleReplyMetaMap, ...memoryReplyMetaMap]);
  }

  return {
    activeTab,
    initialFollowing: !!existingFollowRows[0],
    followedByProfile: !!reverseFollowRows[0],
    followerCount: followerResult.count,
    followingCount: followingResult.count,
    posts,
    topicsCount,
    topicsCurrentPage,
    topicsTotalPages,
    problemPositions,
    problemsCount,
    problemsCurrentPage,
    problemsTotalPages,
    problemLikeMetaMap,
    problemReplyMetaMap,
    userAchievementRows,
  };
}
