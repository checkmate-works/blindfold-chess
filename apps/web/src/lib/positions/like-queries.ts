import { type LikeMeta, getLikeMeta, getLikeMetaMap } from '@/lib/db/like-queries';

export type PositionLikeMeta = LikeMeta;

/**
 * Get like metadata for a single position.
 *
 * Thin wrapper around the generic {@link getLikeMeta} helper that fixes
 * `targetType` to `'position'`.
 */
export function getPositionLikeMeta(
  positionId: string,
  currentUserId?: string
): Promise<PositionLikeMeta> {
  return getLikeMeta('position', positionId, currentUserId);
}

/**
 * Batch-load like metadata for a list of positions.
 *
 * Thin wrapper around the generic {@link getLikeMetaMap} helper.
 */
export function getPositionLikeMetaMap(
  positionIds: string[],
  currentUserId?: string
): Promise<Map<string, PositionLikeMeta>> {
  return getLikeMetaMap('position', positionIds, currentUserId);
}
