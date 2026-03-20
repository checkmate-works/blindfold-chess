import { and, asc, count, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import {
  chessOpenings,
  db,
  profiles,
  topicPostLikes,
  topicPostRatings,
  topicPosts,
} from '@/lib/db';
import type { Profile, TopicPost, TopicPostRating } from '@/lib/db';

/**
 * Shared Drizzle select fragments reused across topic query files.
 */
export const authorSelect = {
  username: profiles.username,
  displayName: profiles.displayName,
  avatarUrl: profiles.avatarUrl,
  flair: profiles.flair,
  country: profiles.country,
} as const;

export const ratingSelect = {
  preferenceRating: topicPostRatings.preferenceRating,
  proficiencyRating: topicPostRatings.proficiencyRating,
} as const;

export type TopicPostWithAuthor = TopicPost & {
  author: Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'flair' | 'country'> | null;
};

export type Replier = {
  avatarUrl: string | null;
  displayName: string;
};

export type ReplyMeta = {
  replyCount: number;
  latestReplyAt: Date | null;
  repliers: Replier[];
  uniqueReplierCount: number;
};

export type LikeMeta = {
  likeCount: number;
  likedByMe: boolean;
};

export type PostWithReplyMeta = TopicPostWithAuthor & {
  replyMeta: ReplyMeta;
  likeMeta: LikeMeta;
};

export type ProfilePostWithReplyMeta = PostWithReplyMeta & {
  topicKey: string;
  rating: Pick<TopicPostRating, 'preferenceRating' | 'proficiencyRating'> | null;
  openingName: string | null;
  openingFen: string | null;
};

export type SortMode = 'new' | 'popular' | 'active';

/**
 * Sort posts by the given mode. Mutates and returns the array.
 * - 'new': no-op (assumes posts are already sorted by createdAt DESC from the DB query)
 * - 'popular': by likeCount DESC, then createdAt DESC
 * - 'active': by latestReplyAt DESC, then createdAt DESC
 */
export function sortPosts<T extends PostWithReplyMeta>(posts: T[], sortBy: SortMode): T[] {
  if (sortBy === 'popular') {
    return posts.sort((a, b) => {
      const likeDiff = b.likeMeta.likeCount - a.likeMeta.likeCount;
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  if (sortBy === 'active') {
    return posts.sort((a, b) => {
      const aLatest = a.replyMeta.latestReplyAt ? new Date(a.replyMeta.latestReplyAt).getTime() : 0;
      const bLatest = b.replyMeta.latestReplyAt ? new Date(b.replyMeta.latestReplyAt).getTime() : 0;
      const replyDiff = bLatest - aLatest;
      if (replyDiff !== 0) return replyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // 'new' — already sorted by createdAt DESC from the DB query
  return posts;
}

/**
 * Attach post metadata (reply counts, replier avatars, like counts) to posts.
 * Uses batch queries to avoid N+1.
 * Topic-generic: works on any postIds regardless of topicType.
 */
export async function attachPostMeta(
  posts: TopicPostWithAuthor[],
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  if (posts.length === 0) {
    return [];
  }

  const postIds = posts.map((p) => p.id);

  // Batch query 1: reply counts and latest reply timestamp per root post.
  // Uses rootPostId so all replies in a flat thread (including reply-to-reply)
  // are counted under the top-level post.
  const replyStats = await db
    .select({
      rootPostId: topicPosts.rootPostId,
      replyCount: count(),
      latestReplyAt: max(topicPosts.createdAt),
    })
    .from(topicPosts)
    .where(and(inArray(topicPosts.rootPostId, postIds), isNull(topicPosts.deletedAt)))
    .groupBy(topicPosts.rootPostId);

  // Batch query 2: replies with author info for replier display (grouped by rootPostId)
  const repliesWithAuthors = await db
    .select({
      rootPostId: topicPosts.rootPostId,
      userId: topicPosts.userId,
      avatarUrl: profiles.avatarUrl,
      displayName: profiles.displayName,
      username: profiles.username,
      createdAt: topicPosts.createdAt,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(and(inArray(topicPosts.rootPostId, postIds), isNull(topicPosts.deletedAt)))
    .orderBy(desc(topicPosts.createdAt));

  // Batch query 3: like counts per post
  const likeCounts = await db
    .select({
      postId: topicPostLikes.postId,
      likeCount: count(),
    })
    .from(topicPostLikes)
    .where(inArray(topicPostLikes.postId, postIds))
    .groupBy(topicPostLikes.postId);

  // Batch query 4: which posts the current user has liked
  let userLikedPostIds = new Set<string>();
  if (currentUserId) {
    const userLikes = await db
      .select({ postId: topicPostLikes.postId })
      .from(topicPostLikes)
      .where(
        and(eq(topicPostLikes.userId, currentUserId), inArray(topicPostLikes.postId, postIds))
      );
    userLikedPostIds = new Set(userLikes.map((l) => l.postId));
  }

  // Build lookup maps
  const statsMap = new Map(
    replyStats.map((r) => [
      r.rootPostId,
      { replyCount: r.replyCount, latestReplyAt: r.latestReplyAt },
    ])
  );

  const likeCountMap = new Map(likeCounts.map((l) => [l.postId, l.likeCount]));

  // Collect up to 3 unique repliers per root post (most recent, deduplicated by userId)
  // while tracking ALL unique repliers for the +N overflow count
  const repliersMap = new Map<string, Replier[]>();
  const seenUsers = new Map<string, Set<string>>();
  for (const row of repliesWithAuthors) {
    if (!row.rootPostId) continue;
    const seen = seenUsers.get(row.rootPostId) ?? new Set();
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    seenUsers.set(row.rootPostId, seen);
    const existing = repliersMap.get(row.rootPostId) ?? [];
    if (existing.length < 3) {
      existing.push({
        avatarUrl: row.avatarUrl,
        displayName: row.displayName || row.username || 'Anonymous',
      });
      repliersMap.set(row.rootPostId, existing);
    }
  }

  return posts.map((post) => {
    const stats = statsMap.get(post.id);
    return {
      ...post,
      replyMeta: {
        replyCount: stats?.replyCount ?? 0,
        latestReplyAt: stats?.latestReplyAt ?? null,
        repliers: repliersMap.get(post.id) ?? [],
        uniqueReplierCount: seenUsers.get(post.id)?.size ?? 0,
      },
      likeMeta: {
        likeCount: likeCountMap.get(post.id) ?? 0,
        likedByMe: userLikedPostIds.has(post.id),
      },
    };
  });
}

/**
 * Build ProfilePostWithReplyMeta[] from query results that include rating/opening data.
 * Extracts the duplicated pattern of building ratingMap, openingNameMap, openingFenMap,
 * calling attachPostMeta, and merging the maps.
 */
export async function attachProfilePostMeta(
  results: {
    post: TopicPost;
    author: Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'flair' | 'country'> | null;
    rating: Pick<TopicPostRating, 'preferenceRating' | 'proficiencyRating'> | null;
    openingName: string | null;
    openingFen: string | null;
  }[],
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> {
  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  const ratingMap = new Map(
    results
      .filter((r) => r.rating?.preferenceRating !== null || r.rating?.proficiencyRating !== null)
      .map((r) => [r.post.id, r.rating])
  );

  const openingNameMap = new Map(
    results.filter((r) => r.openingName !== null).map((r) => [r.post.id, r.openingName])
  );

  const openingFenMap = new Map(
    results.filter((r) => r.openingFen !== null).map((r) => [r.post.id, r.openingFen])
  );

  const postsWithMeta = await attachPostMeta(posts, currentUserId);

  return postsWithMeta.map((p) => ({
    ...p,
    topicKey: p.topicKey,
    rating: ratingMap.get(p.id) ?? null,
    openingName: openingNameMap.get(p.id) ?? null,
    openingFen: openingFenMap.get(p.id) ?? null,
  }));
}

/**
 * Get like metadata for a single post.
 * Topic-generic: works on any postId regardless of topicType.
 */
export async function getLikeMetaForPost(
  postId: string,
  currentUserId?: string
): Promise<LikeMeta> {
  const [result] = await db
    .select({ count: count() })
    .from(topicPostLikes)
    .where(eq(topicPostLikes.postId, postId));

  let likedByMe = false;
  if (currentUserId) {
    const userLike = await db
      .select({ id: topicPostLikes.id })
      .from(topicPostLikes)
      .where(and(eq(topicPostLikes.userId, currentUserId), eq(topicPostLikes.postId, postId)))
      .limit(1);
    likedByMe = userLike.length > 0;
  }

  return {
    likeCount: result.count,
    likedByMe,
  };
}

/**
 * Get replies for a specific post with like metadata.
 * Topic-generic: works on any postId regardless of topicType.
 */
export async function getRepliesByPostId(
  postId: string,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(and(eq(topicPosts.rootPostId, postId), isNull(topicPosts.deletedAt)))
    .orderBy(asc(topicPosts.createdAt));

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}

/**
 * Get the most recent top-level posts across all topic types (square + opening) with reply metadata.
 */
export async function getRecentPostsAcrossTopics(
  limit = 5,
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
      rating: ratingSelect,
      openingName: chessOpenings.name,
      openingFen: chessOpenings.fen,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .leftJoin(chessOpenings, eq(topicPosts.topicKey, chessOpenings.slug))
    .where(
      and(
        inArray(topicPosts.topicType, ['square', 'opening']),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt))
    .limit(limit);

  return attachProfilePostMeta(results, currentUserId);
}

/**
 * Get the count of top-level posts across all topic types (square + opening).
 */
export async function getPostCountAcrossTopics(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(topicPosts)
    .where(
      and(
        inArray(topicPosts.topicType, ['square', 'opening']),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    );
  return result.count;
}

/**
 * Get top-level posts across all topic types (square + opening) with reply metadata, paginated.
 */
export async function getPostsAcrossTopicsPaginated(
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
      rating: ratingSelect,
      openingName: chessOpenings.name,
      openingFen: chessOpenings.fen,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .leftJoin(chessOpenings, eq(topicPosts.topicKey, chessOpenings.slug))
    .where(
      and(
        inArray(topicPosts.topicType, ['square', 'opening']),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt))
    .limit(limit)
    .offset(offset);

  return attachProfilePostMeta(results, currentUserId);
}

/**
 * Get the count of posts liked by a specific user (across all topic types).
 */
export async function getLikedPostCountByUser(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(topicPostLikes)
    .innerJoin(topicPosts, eq(topicPostLikes.postId, topicPosts.id))
    .where(and(eq(topicPostLikes.userId, userId), isNull(topicPosts.deletedAt)));
  return result.count;
}

/**
 * Get posts liked by a specific user, ordered by like date (newest first), paginated.
 * Returns posts with reply/like metadata, topicKey, and opening metadata for both
 * 'square' and 'opening' topic types.
 */
export async function getLikedPostsByUser(
  userId: string,
  limit?: number,
  offset?: number
): Promise<ProfilePostWithReplyMeta[]> {
  let query = db
    .select({
      post: topicPosts,
      author: authorSelect,
      rating: ratingSelect,
      openingName: chessOpenings.name,
      openingFen: chessOpenings.fen,
      likedAt: topicPostLikes.createdAt,
    })
    .from(topicPostLikes)
    .innerJoin(topicPosts, eq(topicPostLikes.postId, topicPosts.id))
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .leftJoin(chessOpenings, eq(topicPosts.topicKey, chessOpenings.slug))
    .where(and(eq(topicPostLikes.userId, userId), isNull(topicPosts.deletedAt)))
    .orderBy(desc(topicPostLikes.createdAt))
    .$dynamic();

  if (limit !== undefined) {
    query = query.limit(limit);
  }
  if (offset !== undefined) {
    query = query.offset(offset);
  }

  const results = await query;

  return attachProfilePostMeta(results, userId);
}

/**
 * Get top-level posts by a specific user, ordered by creation date (newest first).
 * Returns posts with reply/like metadata, the topicKey, and optional rating for each post.
 * Includes both 'square' and 'opening' topic types.
 */
export async function getPostsByUserId(
  userId: string,
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
      rating: ratingSelect,
      openingName: chessOpenings.name,
      openingFen: chessOpenings.fen,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .leftJoin(chessOpenings, eq(topicPosts.topicKey, chessOpenings.slug))
    .where(
      and(
        eq(topicPosts.userId, userId),
        inArray(topicPosts.topicType, ['square', 'opening']),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt));

  return attachProfilePostMeta(results, currentUserId);
}
