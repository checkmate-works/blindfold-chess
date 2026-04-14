import { and, count, eq, inArray } from 'drizzle-orm';

import { db, likes } from './index';

export type LikeMeta = {
  likeCount: number;
  likedByMe: boolean;
};

/**
 * Polymorphic like-meta lookup — returns count + liked-by-me for a
 * single `(targetType, targetId)` pair.
 *
 * Generic helper shared across topics, positions, and any future
 * likeable target.
 */
export async function getLikeMeta(
  targetType: string,
  targetId: string,
  currentUserId?: string
): Promise<LikeMeta> {
  const [result] = await db
    .select({ count: count() })
    .from(likes)
    .where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId)));

  let likedByMe = false;
  if (currentUserId) {
    const userLike = await db
      .select({ id: likes.id })
      .from(likes)
      .where(
        and(
          eq(likes.userId, currentUserId),
          eq(likes.targetType, targetType),
          eq(likes.targetId, targetId)
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
 * Batch variant of {@link getLikeMeta}. Uses two queries (count per id
 * + liked-by-me set) to avoid N+1.
 */
export async function getLikeMetaMap(
  targetType: string,
  targetIds: string[],
  currentUserId?: string
): Promise<Map<string, LikeMeta>> {
  const map = new Map<string, LikeMeta>();
  if (targetIds.length === 0) return map;

  const [counts, userLikes] = await Promise.all([
    db
      .select({ targetId: likes.targetId, likeCount: count() })
      .from(likes)
      .where(and(eq(likes.targetType, targetType), inArray(likes.targetId, targetIds)))
      .groupBy(likes.targetId),
    currentUserId
      ? db
          .select({ targetId: likes.targetId })
          .from(likes)
          .where(
            and(
              eq(likes.userId, currentUserId),
              eq(likes.targetType, targetType),
              inArray(likes.targetId, targetIds)
            )
          )
      : Promise.resolve([]),
  ]);

  const countMap = new Map(counts.map((c) => [c.targetId, c.likeCount]));
  const likedSet = new Set(userLikes.map((l) => l.targetId));

  for (const id of targetIds) {
    map.set(id, {
      likeCount: countMap.get(id) ?? 0,
      likedByMe: likedSet.has(id),
    });
  }

  return map;
}
