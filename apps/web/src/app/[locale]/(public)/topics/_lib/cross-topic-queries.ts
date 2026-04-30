import { unstable_cache } from 'next/cache';

import { and, count, desc, inArray, isNull } from 'drizzle-orm';

import { db, topicPosts } from '@/lib/db';

import { buildProfilePostQuery } from './build-profile-post-query';
import { attachProfilePostMeta } from './post-meta';
import type { ProfilePostWithReplyMeta } from './shared';

/**
 * Get the count of top-level posts across all topic types (square + opening).
 *
 * `chunk` and the position-backed types (`position_memory`,
 * `position_puzzle`) are intentionally excluded — they are reply-equivalent
 * comments scoped to their own catalog page and should not surface in
 * cross-topic lists (mypage feeds, profile post lists, etc.). Same rationale
 * as chunk: see TOPIC_TYPES TSDoc.
 */
export const getPostCountAcrossTopics = unstable_cache(
  async (): Promise<number> => {
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
  },
  ['post-count-across-topics'],
  { tags: ['topics'], revalidate: 60 }
);

/**
 * Get top-level posts across all topic types (square + opening) with reply metadata, paginated.
 */
export async function getPostsAcrossTopicsPaginated(
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> {
  const results = await buildProfilePostQuery()
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
