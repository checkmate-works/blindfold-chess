import type { LikeMeta } from '@/lib/db/like-queries';
import { getLikeMetaMap } from '@/lib/db/like-queries';

/**
 * Like counts + "liked by me" for a batch of repertoires, keyed by id.
 * Thin wrapper over the polymorphic {@link getLikeMetaMap} with
 * `targetType = 'repertoire'`.
 */
export function getRepertoireLikeMetaMap(
  repertoireIds: string[],
  currentUserId?: string
): Promise<Map<string, LikeMeta>> {
  return getLikeMetaMap('repertoire', repertoireIds, currentUserId);
}
