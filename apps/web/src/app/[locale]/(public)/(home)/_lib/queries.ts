import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';

import { chessOpenings, db, feedItems, profiles, topicPostRatings, topicPosts } from '@/lib/db';

import { attachProfilePostMeta } from '@/app/[locale]/(public)/topics/_lib/post-meta';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { authorSelect, ratingSelect } from '@/app/[locale]/(public)/topics/_lib/shared';

import type { ChallengeRankUpdateData, FeedItem, FeedResponse } from './types';

/** Maximum rank shown in the timeline feed. Items beyond this are filtered out. */
const FEED_RANK_THRESHOLD = 10;

/**
 * Fetch a page of feed items with their full entity data.
 *
 * @design Cursor-based pagination
 * The cursor is the ISO 8601 `createdAt` timestamp of the last item on the
 * previous page. The query uses `WHERE created_at < cursor ORDER BY
 * created_at DESC LIMIT N+1` (the +1 detects whether a next page exists).
 *
 * @design Batch entity fetching (avoid N+1)
 * After fetching feed_items rows, entity data is loaded in bulk per
 * entityType (e.g. all topic_post IDs in one query). Items whose source
 * entity was deleted are silently dropped from the result.
 */
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

  // Batch fetch topic_post entities and challenge_rank_update actor profiles in parallel
  const topicPostIds = rows.filter((r) => r.entityType === 'topic_post').map((r) => r.entityId);
  const rankUpdateRows = rows.filter((r) => r.entityType === 'challenge_rank_update');
  const rankUpdateActorIds = [...new Set(rankUpdateRows.map((r) => r.actorId))];

  const [topicPostMap, rankUpdateActorMap] = await Promise.all([
    (async () => {
      const map = new Map<string, ProfilePostWithReplyMeta>();

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
          map.set(post.id, post);
        }
      }

      return map;
    })(),
    (async () => {
      const map = new Map<
        string,
        {
          username: string;
          displayName: string | null;
          avatarUrl: string | null;
          country: string | null;
          flair: string | null;
        }
      >();

      if (rankUpdateActorIds.length > 0) {
        const actorRows = await db
          .select({
            id: profiles.id,
            username: profiles.username,
            displayName: profiles.displayName,
            avatarUrl: profiles.avatarUrl,
            country: profiles.country,
            flair: profiles.flair,
          })
          .from(profiles)
          .where(inArray(profiles.id, rankUpdateActorIds));

        for (const actor of actorRows) {
          map.set(actor.id, {
            username: actor.username,
            displayName: actor.displayName,
            avatarUrl: actor.avatarUrl,
            country: actor.country,
            flair: actor.flair,
          });
        }
      }

      return map;
    })(),
  ]);

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
    } else if (row.entityType === 'challenge_rank_update') {
      const actor = rankUpdateActorMap.get(row.actorId);
      if (actor) {
        const metadata = row.metadata as Record<string, unknown>;
        const rank = metadata.rank as number;
        if (rank > FEED_RANK_THRESHOLD) continue;
        const data: ChallengeRankUpdateData = {
          menuType: metadata.menuType as string,
          leaderboardKey: metadata.leaderboardKey as string,
          score: metadata.score as number,
          incorrectAnswers: metadata.incorrectAnswers as number,
          timeTaken: metadata.timeTaken as number,
          rank,
          isNewEntry: metadata.isNewEntry as boolean,
          actor,
        };
        items.push({
          id: row.id,
          entityType: 'challenge_rank_update',
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
