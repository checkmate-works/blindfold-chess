import { and, eq, inArray, isNull } from 'drizzle-orm';

import {
  SOCIAL_AUTHOR_COLUMNS,
  chessOpenings,
  db,
  liveProfileJoinOn,
  profiles,
  topicPostRatings,
  topicPosts,
} from '@/lib/db';

import { attachProfilePostMeta } from '@/app/[locale]/(public)/topics/_lib/post-meta';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { ratingSelect } from '@/app/[locale]/(public)/topics/_lib/shared';

/**
 * Bulk-load the `topic_post` entities referenced by a slice of feed
 * rows and attach their per-viewer reply/like meta. Returns a
 * `Map<postId, ProfilePostWithReplyMeta>` so the orchestrator can
 * cheaply look up each feed row's data.
 *
 * Soft-deleted topic posts are excluded by the `isNull(deletedAt)`
 * filter; the orchestrator silently drops feed rows whose entity is
 * missing from the map (matches the same pattern used for positions
 * and chunks).
 */
export async function loadTopicPostsForFeed(
  topicPostIds: string[],
  currentUserId: string | undefined
): Promise<Map<string, ProfilePostWithReplyMeta>> {
  const map = new Map<string, ProfilePostWithReplyMeta>();

  if (topicPostIds.length === 0) return map;

  const results = await db
    .select({
      post: topicPosts,
      author: SOCIAL_AUTHOR_COLUMNS,
      rating: ratingSelect,
      openingName: chessOpenings.name,
      openingFen: chessOpenings.fen,
    })
    .from(topicPosts)
    .leftJoin(profiles, liveProfileJoinOn(topicPosts.userId))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .leftJoin(chessOpenings, eq(topicPosts.topicKey, chessOpenings.slug))
    .where(and(inArray(topicPosts.id, topicPostIds), isNull(topicPosts.deletedAt)));

  const postsWithMeta = await attachProfilePostMeta(results, currentUserId);
  for (const post of postsWithMeta) {
    map.set(post.id, post);
  }

  return map;
}
