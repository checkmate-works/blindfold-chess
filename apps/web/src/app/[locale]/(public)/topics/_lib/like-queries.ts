import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { chessOpenings, db, likes, profiles, topicPostRatings, topicPosts } from '@/lib/db';

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
    .from(likes)
    .where(and(eq(likes.targetType, 'topic_post'), eq(likes.targetId, postId)));

  let likedByMe = false;
  if (currentUserId) {
    const userLike = await db
      .select({ id: likes.id })
      .from(likes)
      .where(
        and(
          eq(likes.userId, currentUserId),
          eq(likes.targetType, 'topic_post'),
          eq(likes.targetId, postId)
        )
      )
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
    .from(likes)
    .innerJoin(topicPosts, eq(likes.targetId, topicPosts.id))
    .where(
      and(
        eq(likes.userId, userId),
        eq(likes.targetType, 'topic_post'),
        isNull(topicPosts.deletedAt)
      )
    );
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
      likedAt: likes.createdAt,
    })
    .from(likes)
    .innerJoin(topicPosts, eq(likes.targetId, topicPosts.id))
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .leftJoin(chessOpenings, eq(topicPosts.topicKey, chessOpenings.slug))
    .where(
      and(
        eq(likes.userId, userId),
        eq(likes.targetType, 'topic_post'),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(likes.createdAt))
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
