import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db, topicPosts } from '@/lib/db';

import { buildProfilePostQuery } from './build-profile-post-query';
import { attachProfilePostMeta } from './post-meta';
import type { ProfilePostWithReplyMeta } from './shared';

/**
 * Get top-level posts by a specific user, ordered by creation date (newest first).
 * Returns posts with reply/like metadata, the topicKey, and optional rating for each post.
 * Includes both 'square' and 'opening' topic types.
 */
export async function getPostsByUserId(
  userId: string,
  currentUserId?: string,
  limit?: number,
  offset?: number
): Promise<ProfilePostWithReplyMeta[]> {
  let query = buildProfilePostQuery()
    .where(
      and(
        eq(topicPosts.userId, userId),
        inArray(topicPosts.topicType, ['square', 'opening']),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt));

  if (limit !== undefined) {
    query = query.limit(limit);
  }
  if (offset !== undefined) {
    query = query.offset(offset);
  }

  const results = await query;

  return attachProfilePostMeta(results, currentUserId);
}

/**
 * Get the count of top-level posts by a specific user (across all topic types).
 */
export async function getPostCountByUserId(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(topicPosts)
    .where(
      and(
        eq(topicPosts.userId, userId),
        inArray(topicPosts.topicType, ['square', 'opening']),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    );
  return result.count;
}
