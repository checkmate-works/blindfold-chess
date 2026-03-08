import { and, count, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import { db, profiles, topicPostLikes, topicPosts } from '@/lib/db';
import type { Profile, TopicPost } from '@/lib/db';

export type TopicPostWithAuthor = TopicPost & {
  author: Pick<Profile, 'username' | 'displayName' | 'avatarUrl'> | null;
};

/**
 * Get top-level posts for a specific square
 */
export async function getPostsForSquare(square: string): Promise<TopicPostWithAuthor[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.topicType, 'square'),
        eq(topicPosts.topicKey, square),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt));

  return results.map((r) => ({
    ...r.post,
    author: r.author,
  }));
}

/**
 * Get a single post by ID, verifying it belongs to the given square
 */
export async function getPostById(
  postId: string,
  square: string
): Promise<TopicPostWithAuthor | null> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.id, postId),
        eq(topicPosts.topicType, 'square'),
        eq(topicPosts.topicKey, square),
        isNull(topicPosts.deletedAt)
      )
    )
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  return {
    ...results[0].post,
    author: results[0].author,
  };
}

export type Replier = {
  avatarUrl: string | null;
  displayName: string;
};

export type ReplyMeta = {
  replyCount: number;
  latestReplyAt: Date | null;
  repliers: Replier[];
};

export type LikeMeta = {
  likeCount: number;
  likedByMe: boolean;
};

export type PostWithReplyMeta = TopicPostWithAuthor & {
  replyMeta: ReplyMeta;
  likeMeta: LikeMeta;
};

/**
 * Attach post metadata (reply counts, replier avatars, like counts) to posts.
 * Uses batch queries to avoid N+1.
 */
async function attachPostMeta(
  posts: TopicPostWithAuthor[],
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  if (posts.length === 0) {
    return [];
  }

  const postIds = posts.map((p) => p.id);

  // Batch query 1: reply counts and latest reply timestamp per parent
  const replyStats = await db
    .select({
      parentId: topicPosts.parentId,
      replyCount: count(),
      latestReplyAt: max(topicPosts.createdAt),
    })
    .from(topicPosts)
    .where(and(inArray(topicPosts.parentId, postIds), isNull(topicPosts.deletedAt)))
    .groupBy(topicPosts.parentId);

  // Batch query 2: replies with author info for replier display
  const repliesWithAuthors = await db
    .select({
      parentId: topicPosts.parentId,
      userId: topicPosts.userId,
      avatarUrl: profiles.avatarUrl,
      displayName: profiles.displayName,
      username: profiles.username,
      createdAt: topicPosts.createdAt,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(and(inArray(topicPosts.parentId, postIds), isNull(topicPosts.deletedAt)))
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
      r.parentId,
      { replyCount: r.replyCount, latestReplyAt: r.latestReplyAt },
    ])
  );

  const likeCountMap = new Map(likeCounts.map((l) => [l.postId, l.likeCount]));

  // Collect up to 3 unique repliers per post (most recent, deduplicated by userId)
  const repliersMap = new Map<string, Replier[]>();
  const seenUsers = new Map<string, Set<string>>();
  for (const row of repliesWithAuthors) {
    if (!row.parentId) continue;
    const seen = seenUsers.get(row.parentId) ?? new Set();
    if (seen.has(row.userId)) continue;
    const existing = repliersMap.get(row.parentId) ?? [];
    if (existing.length >= 3) continue;
    seen.add(row.userId);
    seenUsers.set(row.parentId, seen);
    existing.push({
      avatarUrl: row.avatarUrl,
      displayName: row.displayName || row.username || 'Anonymous',
    });
    repliersMap.set(row.parentId, existing);
  }

  return posts.map((post) => {
    const stats = statsMap.get(post.id);
    return {
      ...post,
      replyMeta: {
        replyCount: stats?.replyCount ?? 0,
        latestReplyAt: stats?.latestReplyAt ?? null,
        repliers: repliersMap.get(post.id) ?? [],
      },
      likeMeta: {
        likeCount: likeCountMap.get(post.id) ?? 0,
        likedByMe: userLikedPostIds.has(post.id),
      },
    };
  });
}

/**
 * Get top-level posts for a square with reply metadata.
 */
export async function getPostsWithReplyMeta(
  square: string,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const posts = await getPostsForSquare(square);
  return attachPostMeta(posts, currentUserId);
}

/**
 * Get the most recent top-level posts across all squares with reply metadata.
 */
export async function getRecentPostsAcrossSquares(
  limit = 5,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.topicType, 'square'),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt))
    .limit(limit);

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}

/**
 * Get like metadata for a single post.
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
 * Get posts liked by a specific user, ordered by like date (newest first).
 * Returns posts with reply/like metadata and the topicKey for each post.
 */
export async function getLikedPostsByUser(
  userId: string
): Promise<(PostWithReplyMeta & { topicKey: string })[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
      likedAt: topicPostLikes.createdAt,
    })
    .from(topicPostLikes)
    .innerJoin(topicPosts, eq(topicPostLikes.postId, topicPosts.id))
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(and(eq(topicPostLikes.userId, userId), isNull(topicPosts.deletedAt)))
    .orderBy(desc(topicPostLikes.createdAt));

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  const postsWithMeta = await attachPostMeta(posts, userId);

  return postsWithMeta.map((p) => ({
    ...p,
    topicKey: p.topicKey,
  }));
}

/**
 * Get top-level posts by a specific user, ordered by creation date (newest first).
 * Returns posts with reply/like metadata and the topicKey for each post.
 */
export async function getPostsByUserId(
  userId: string,
  currentUserId?: string
): Promise<(PostWithReplyMeta & { topicKey: string })[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.userId, userId),
        eq(topicPosts.topicType, 'square'),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt));

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  const postsWithMeta = await attachPostMeta(posts, currentUserId);

  return postsWithMeta.map((p) => ({
    ...p,
    topicKey: p.topicKey,
  }));
}

/**
 * Get replies for a specific post with like metadata
 */
export async function getRepliesByPostId(
  postId: string,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(and(eq(topicPosts.parentId, postId), isNull(topicPosts.deletedAt)))
    .orderBy(desc(topicPosts.createdAt));

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}
