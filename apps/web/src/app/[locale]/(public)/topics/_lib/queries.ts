import { and, asc, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import {
  chessOpenings,
  db,
  profiles,
  topicPostLikes,
  topicPostRatings,
  topicPosts,
} from '@/lib/db';

import { attachPostMeta, attachProfilePostMeta } from './post-meta';
import { authorSelect, ratingSelect } from './shared';
import type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  TopicPostWithAuthor,
} from './shared';

// Re-export shared types and functions for backward compatibility
export { attachPostMeta, attachProfilePostMeta } from './post-meta';
export { authorSelect, ratingSelect, sortPosts } from './shared';
export type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  Replier,
  ReplyMeta,
  SortMode,
  TopicPostWithAuthor,
} from './shared';

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
