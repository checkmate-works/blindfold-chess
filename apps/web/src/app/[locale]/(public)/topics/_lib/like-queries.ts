import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import {
  chessOpenings,
  db,
  likes,
  liveProfileJoinOn,
  profiles,
  topicPostRatings,
  topicPosts,
} from '@/lib/db';

import { attachProfilePostMeta } from './post-meta';
import { authorSelect, ratingSelect } from './shared';
import type { ProfilePostWithReplyMeta } from './shared';

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
        inArray(topicPosts.topicType, ['square', 'opening']),
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
    .leftJoin(profiles, liveProfileJoinOn(topicPosts.userId))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .leftJoin(chessOpenings, eq(topicPosts.topicKey, chessOpenings.slug))
    .where(
      and(
        eq(likes.userId, userId),
        eq(likes.targetType, 'topic_post'),
        inArray(topicPosts.topicType, ['square', 'opening']),
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
