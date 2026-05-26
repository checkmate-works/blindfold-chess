import { desc, lt } from 'drizzle-orm';

import { db, feedItems } from '@/lib/db';

import { loadChunksForFeed } from './feed-queries/load-chunks';
import { loadPositionsForFeed } from './feed-queries/load-positions';
import { loadRankUpdateActors } from './feed-queries/load-rank-update-actors';
import { loadTopicPostsForFeed } from './feed-queries/load-topic-posts';
import type { ChallengeRankUpdateData, FeedItem, FeedResponse } from './types';

/** Maximum rank shown in the timeline feed. Items beyond this are filtered out. */
const FEED_RANK_THRESHOLD = 10;

/**
 * Fetch a page of feed items with their full entity data.
 *
 * @design Cursor-based pagination
 * The cursor is the ISO 8601 `createdAt` timestamp of the last item on
 * the previous page. The query uses
 * `WHERE created_at < cursor ORDER BY created_at DESC LIMIT N+1` (the
 * `+1` detects whether a next page exists).
 *
 * @design Per-entity-type loaders
 * After fetching the `feed_items` rows, the four entity loaders run in
 * parallel — one per `entityType`. Each loader returns a
 * `Map<entityId, data>` and silently drops rows whose source entity
 * has been deleted; the orchestrator then walks the original feed rows
 * and skips any whose entity is missing from the map. Splitting one
 * loader per type makes each loader read like a focused query helper
 * instead of a branch inside a 200-line IIFE chain.
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

  const topicPostIds = rows.filter((r) => r.entityType === 'topic_post').map((r) => r.entityId);
  const positionIds = rows.filter((r) => r.entityType === 'position').map((r) => r.entityId);
  const chunkIds = rows.filter((r) => r.entityType === 'chunk').map((r) => r.entityId);
  const rankUpdateActorIds = [
    ...new Set(rows.filter((r) => r.entityType === 'challenge_rank_update').map((r) => r.actorId)),
  ];

  const [topicPostMap, positionMap, chunkMap, rankUpdateActorMap] = await Promise.all([
    loadTopicPostsForFeed(topicPostIds, currentUserId),
    loadPositionsForFeed(positionIds, currentUserId),
    loadChunksForFeed(chunkIds, currentUserId),
    loadRankUpdateActors(rankUpdateActorIds),
  ]);

  // Build FeedItem array, filtering out items whose entity data was
  // not found (the entity has been deleted between feed-item write
  // and feed read).
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
    } else if (row.entityType === 'position') {
      const data = positionMap.get(row.entityId);
      if (data) {
        items.push({
          id: row.id,
          entityType: 'position',
          entityId: row.entityId,
          actorId: row.actorId,
          createdAt: row.createdAt.toISOString(),
          data,
        });
      }
    } else if (row.entityType === 'chunk') {
      const data = chunkMap.get(row.entityId);
      if (data) {
        const metadata = (row.metadata ?? {}) as Record<string, unknown>;
        const kind = metadata.kind === 'published' ? 'published' : 'created';
        items.push({
          id: row.id,
          entityType: 'chunk',
          entityId: row.entityId,
          actorId: row.actorId,
          createdAt: row.createdAt.toISOString(),
          data: { ...data, kind },
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
