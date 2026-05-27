import { and, eq, inArray, isNull } from 'drizzle-orm';

import { getChunkLikeMetaMap } from '@/lib/chunks/like-queries';
import { chunks, db, profiles } from '@/lib/db';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';

import type { ChunkFeedData } from '../types';

/**
 * Bulk-load the `chunk` entities referenced by a slice of feed rows,
 * plus their per-viewer like + reply meta. Comments on a chunk live in
 * `topic_posts` keyed by `(topicType='chunk', topicKey=chunk.slug)` —
 * the same polymorphic pattern positions use, but keyed by slug
 * instead of id.
 *
 * Each row's `kind` is left as the placeholder `'created'`; the
 * orchestrator overrides it from the feed row's metadata because the
 * same chunk row can produce two feed items (one `created`, one
 * `published`) and the kind belongs to the feed row, not the chunk.
 */
export async function loadChunksForFeed(
  chunkIds: string[],
  currentUserId: string | undefined
): Promise<Map<string, ChunkFeedData>> {
  const map = new Map<string, ChunkFeedData>();

  if (chunkIds.length === 0) return map;

  const chunkRows = await db
    .select({
      id: chunks.id,
      slug: chunks.slug,
      title: chunks.title,
      description: chunks.description,
      representativeFen: chunks.representativeFen,
      createdAt: chunks.createdAt,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        country: profiles.country,
        flair: profiles.flair,
      },
    })
    .from(chunks)
    .leftJoin(profiles, eq(chunks.userId, profiles.id))
    .where(and(inArray(chunks.id, chunkIds), isNull(chunks.deletedAt)));

  const foundIds = chunkRows.map((r) => r.id);
  const foundSlugs = chunkRows.map((r) => r.slug);
  const [likeMetaMap, replyMetaMap] = await Promise.all([
    getChunkLikeMetaMap(foundIds, currentUserId),
    getReplyMetaMap('chunk', foundSlugs),
  ]);

  for (const row of chunkRows) {
    const likeMeta = likeMetaMap.get(row.id) ?? { likeCount: 0, likedByMe: false };
    const replyMeta = replyMetaMap.get(row.slug) ?? EMPTY_REPLY_META;
    map.set(row.id, {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      representativeFen: row.representativeFen,
      kind: 'created',
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
