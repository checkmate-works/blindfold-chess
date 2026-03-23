import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';

import { chessOpenings, db, feedItems, profiles, topicPostRatings, topicPosts } from '@/lib/db';

import { attachProfilePostMeta } from '@/app/[locale]/(public)/topics/_lib/post-meta';
import { authorSelect, ratingSelect } from '@/app/[locale]/(public)/topics/_lib/shared';

import type { FeedItem, FeedResponse } from './types';

export async function getFeedData(
  cursor: string | undefined,
  limit: number,
  currentUserId?: string
): Promise<FeedResponse> {
  const feedRows = await db
    .select()
    .from(feedItems)
    .where(cursor ? lt(feedItems.createdAt, new Date(cursor)) : undefined)
    .orderBy(desc(feedItems.createdAt))
    .limit(limit + 1);

  const hasMore = feedRows.length > limit;
  const rows = hasMore ? feedRows.slice(0, limit) : feedRows;
  const nextCursor = hasMore ? rows[rows.length - 1].createdAt.toISOString() : null;

  // Batch fetch topic_post entities
  const topicPostIds = rows.filter((r) => r.entityType === 'topic_post').map((r) => r.entityId);

  const topicPostMap = new Map<string, FeedItem['data']>();

  if (topicPostIds.length > 0) {
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
      .where(and(inArray(topicPosts.id, topicPostIds), isNull(topicPosts.deletedAt)));

    const postsWithMeta = await attachProfilePostMeta(results, currentUserId);
    for (const post of postsWithMeta) {
      topicPostMap.set(post.id, post);
    }
  }

  // Build FeedItem array, filtering out items whose entity data was not found
  const items: FeedItem[] = [];
  for (const row of rows) {
    if (row.entityType === 'topic_post') {
      const data = topicPostMap.get(row.entityId);
      if (data) {
        items.push({
          id: row.id,
          entityType: 'topic_post',
          entityId: row.entityId,
          actorId: row.actorId,
          createdAt: row.createdAt.toISOString(),
          data,
        });
      }
    }
  }

  return { items, nextCursor };
}
