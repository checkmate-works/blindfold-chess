import { and, count, eq, inArray } from 'drizzle-orm';

import { db, likes } from '@/lib/db';

export type PositionLikeMeta = {
  likeCount: number;
  likedByMe: boolean;
};

/**
 * Get like metadata for a single position.
 */
export async function getPositionLikeMeta(
  positionId: string,
  currentUserId?: string
): Promise<PositionLikeMeta> {
  const [result] = await db
    .select({ count: count() })
    .from(likes)
    .where(and(eq(likes.targetType, 'position'), eq(likes.targetId, positionId)));

  let likedByMe = false;
  if (currentUserId) {
    const userLike = await db
      .select({ id: likes.id })
      .from(likes)
      .where(
        and(
          eq(likes.userId, currentUserId),
          eq(likes.targetType, 'position'),
          eq(likes.targetId, positionId)
        )
      )
      .limit(1);
    likedByMe = userLike.length > 0;
  }

  return {
    likeCount: result.count,
    likedByMe,
  };
}

/**
 * Batch-load like metadata for a list of positions. Uses two queries
 * (count per id + liked-by-me set) to avoid N+1.
 */
export async function getPositionLikeMetaMap(
  positionIds: string[],
  currentUserId?: string
): Promise<Map<string, PositionLikeMeta>> {
  const map = new Map<string, PositionLikeMeta>();
  if (positionIds.length === 0) return map;

  const [counts, userLikes] = await Promise.all([
    db
      .select({ positionId: likes.targetId, likeCount: count() })
      .from(likes)
      .where(and(eq(likes.targetType, 'position'), inArray(likes.targetId, positionIds)))
      .groupBy(likes.targetId),
    currentUserId
      ? db
          .select({ positionId: likes.targetId })
          .from(likes)
          .where(
            and(
              eq(likes.userId, currentUserId),
              eq(likes.targetType, 'position'),
              inArray(likes.targetId, positionIds)
            )
          )
      : Promise.resolve([]),
  ]);

  const countMap = new Map(counts.map((c) => [c.positionId, c.likeCount]));
  const likedSet = new Set(userLikes.map((l) => l.positionId));

  for (const id of positionIds) {
    map.set(id, {
      likeCount: countMap.get(id) ?? 0,
      likedByMe: likedSet.has(id),
    });
  }

  return map;
}
