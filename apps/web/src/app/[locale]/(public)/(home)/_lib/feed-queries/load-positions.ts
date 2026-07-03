import { and, inArray, isNull } from 'drizzle-orm';

import { AUTHOR_PROFILE_COLUMNS, db, liveProfileJoinOn, positions, profiles } from '@/lib/db';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { parsePositionType } from '@/lib/positions/types';

import type { PositionFeedData } from '../types';

/**
 * Bulk-load the `position` entities referenced by a slice of feed
 * rows, plus their per-viewer like meta and reply meta. Comments live
 * in `topic_posts` keyed by `(topicType, positionId)`, and memory vs.
 * puzzle positions use different `topicType` values — the two reply
 * pools are fetched in parallel and merged here so the orchestrator
 * sees one flat map.
 *
 * Soft-deleted positions are excluded by `isNull(deletedAt)`. Rows
 * with a `type` value outside the known union are dropped defensively
 * rather than crashing, matching the pattern used elsewhere in the
 * feed loader.
 */
export async function loadPositionsForFeed(
  positionIds: string[],
  currentUserId: string | undefined
): Promise<Map<string, PositionFeedData>> {
  const map = new Map<string, PositionFeedData>();

  if (positionIds.length === 0) return map;

  const rows = await db
    .select({
      id: positions.id,
      type: positions.type,
      fen: positions.fen,
      createdAt: positions.createdAt,
      author: {
        ...AUTHOR_PROFILE_COLUMNS,
        country: profiles.country,
        flair: profiles.flair,
      },
    })
    .from(positions)
    .leftJoin(profiles, liveProfileJoinOn(positions.userId))
    .where(and(inArray(positions.id, positionIds), isNull(positions.deletedAt)));

  const foundIds = rows.map((r) => r.id);
  const memoryIds = rows.filter((r) => parsePositionType(r.type) === 'memory').map((r) => r.id);
  const puzzleIds = rows.filter((r) => parsePositionType(r.type) === 'puzzle').map((r) => r.id);
  const [likeMetaMap, memoryReplyMap, puzzleReplyMap] = await Promise.all([
    getPositionLikeMetaMap(foundIds, currentUserId),
    getReplyMetaMap('position_memory', memoryIds),
    getReplyMetaMap('position_puzzle', puzzleIds),
  ]);

  for (const row of rows) {
    const positionType = parsePositionType(row.type);
    if (positionType === null) continue;
    const likeMeta = likeMetaMap.get(row.id) ?? { likeCount: 0, likedByMe: false };
    const replyMeta = memoryReplyMap.get(row.id) ?? puzzleReplyMap.get(row.id) ?? EMPTY_REPLY_META;
    map.set(row.id, {
      id: row.id,
      type: positionType,
      fen: row.fen,
      createdAt: row.createdAt.toISOString(),
      author: row.author
        ? {
            username: row.author.username,
            displayName: row.author.displayName,
            avatarUrl: row.author.avatarUrl,
            country: row.author.country,
            flair: row.author.flair,
          }
        : null,
      likeMeta,
      replyMeta,
    });
  }

  return map;
}
