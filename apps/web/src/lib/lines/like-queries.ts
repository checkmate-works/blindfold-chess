import type { LikeMeta } from '@/lib/db/like-queries';
import { getLikeMetaMap } from '@/lib/db/like-queries';

/**
 * Like counts + "liked by me" for a batch of lines, keyed by line id.
 * Thin wrapper over the polymorphic {@link getLikeMetaMap} with
 * `targetType = 'line'` (mirrors `positions/like-queries`).
 */
export function getLineLikeMetaMap(
  lineIds: string[],
  currentUserId?: string
): Promise<Map<string, LikeMeta>> {
  return getLikeMetaMap('line', lineIds, currentUserId);
}
