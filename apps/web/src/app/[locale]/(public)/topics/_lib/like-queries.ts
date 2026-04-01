import { and, count, desc, eq, isNull } from 'drizzle-orm';

import {
  chessOpenings,
  db,
  profiles,
  topicPostLikes,
  topicPostRatings,
  topicPosts,
} from '@/lib/db';

import { attachProfilePostMeta } from './post-meta';
import { authorSelect, ratingSelect } from './shared';
import type { LikeMeta, ProfilePostWithReplyMeta } from './shared';

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
