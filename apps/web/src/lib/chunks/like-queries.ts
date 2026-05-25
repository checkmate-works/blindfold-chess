import { type LikeMeta, getLikeMeta, getLikeMetaMap } from '@/lib/db/like-queries';

export type ChunkLikeMeta = LikeMeta;

/**
 * Get like metadata for a single chunk.
 *
 * Thin wrapper around the generic {@link getLikeMeta} helper that fixes
 * `targetType` to `'chunk'`.
 */
export function getChunkLikeMeta(chunkId: string, currentUserId?: string): Promise<ChunkLikeMeta> {
  return getLikeMeta('chunk', chunkId, currentUserId);
}

/**
 * Batch-load like metadata for a list of chunks.
 *
 * Thin wrapper around the generic {@link getLikeMetaMap} helper.
 */
export function getChunkLikeMetaMap(
  chunkIds: string[],
  currentUserId?: string
): Promise<Map<string, ChunkLikeMeta>> {
  return getLikeMetaMap('chunk', chunkIds, currentUserId);
}
