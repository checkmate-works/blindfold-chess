import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { db, profiles, topicPostLikes, topicPosts } from '@/lib/db';

import {
  attachPostMeta,
  getLikeMetaForPost,
  getPostsByUserId,
  getRepliesByPostId,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  Replier,
  ReplyMeta,
  SortMode,
  TopicPostWithAuthor,
} from '@/app/[locale]/(public)/topics/_lib/queries';

export { attachPostMeta, getPostsByUserId, getLikeMetaForPost, getRepliesByPostId };
export type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  Replier,
  ReplyMeta,
  SortMode,
  TopicPostWithAuthor,
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
        flair: profiles.flair,
        country: profiles.country,
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
        flair: profiles.flair,
        country: profiles.country,
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

/**
 * Get top-level posts for a square with reply metadata, sorted by the given mode.
 */
export async function getPostsWithReplyMeta(
  square: string,
  currentUserId?: string,
  sortBy: SortMode = 'new'
): Promise<PostWithReplyMeta[]> {
  const posts = await getPostsForSquare(square);
  const postsWithMeta = await attachPostMeta(posts, currentUserId);

  if (sortBy === 'popular') {
    return postsWithMeta.sort((a, b) => {
      const likeDiff = b.likeMeta.likeCount - a.likeMeta.likeCount;
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  if (sortBy === 'active') {
    return postsWithMeta.sort((a, b) => {
      const aLatest = a.replyMeta.latestReplyAt ? new Date(a.replyMeta.latestReplyAt).getTime() : 0;
      const bLatest = b.replyMeta.latestReplyAt ? new Date(b.replyMeta.latestReplyAt).getTime() : 0;
      const replyDiff = bLatest - aLatest;
      if (replyDiff !== 0) return replyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // 'new' — already sorted by createdAt DESC from getPostsForSquare
  return postsWithMeta;
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
        flair: profiles.flair,
        country: profiles.country,
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
 * Get the count of top-level posts across all squares.
 */
export async function getPostCountAcrossSquares(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(topicPosts)
    .where(
      and(
        eq(topicPosts.topicType, 'square'),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    );
  return result.count;
}

/**
 * Get top-level posts across all squares with reply metadata, paginated.
 */
export async function getPostsAcrossSquaresPaginated(
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        flair: profiles.flair,
        country: profiles.country,
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
    .limit(limit)
    .offset(offset);

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}

/**
 * Get the count of posts liked by a specific user.
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
 * Returns posts with reply/like metadata and the topicKey for each post.
 */
export async function getLikedPostsByUser(
  userId: string,
  limit?: number,
  offset?: number
): Promise<(PostWithReplyMeta & { topicKey: string })[]> {
  let query = db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        flair: profiles.flair,
        country: profiles.country,
      },
      likedAt: topicPostLikes.createdAt,
    })
    .from(topicPostLikes)
    .innerJoin(topicPosts, eq(topicPostLikes.postId, topicPosts.id))
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
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
