import { and, count, eq } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';

import { db, likes } from './index';
import { toggleByInsert } from './toggle-by-insert';

/**
 * Polymorphic like toggle — generic helper shared by all like Server Actions.
 *
 * Performs the core INSERT/DELETE + count + activity log for a
 * `(targetType, targetId)` pair. Topic-specific concerns like notification
 * dispatch, revalidation, and rate limiting are the caller's responsibility.
 *
 * @returns `{ liked, likeCount }` after the toggle resolved.
 */
export async function toggleLikeForTarget(params: {
  userId: string;
  targetType: string;
  targetId: string;
}): Promise<{ liked: boolean; likeCount: number }> {
  const { userId, targetType, targetId } = params;

  const liked = await toggleByInsert(
    () => db.insert(likes).values({ userId, targetType, targetId }),
    () =>
      db
        .delete(likes)
        .where(
          and(
            eq(likes.userId, userId),
            eq(likes.targetType, targetType),
            eq(likes.targetId, targetId)
          )
        )
  );

  logActivityEvent({
    userId,
    action: liked ? 'like' : 'unlike',
    targetType,
    targetId,
  });

  const [result] = await db
    .select({ count: count() })
    .from(likes)
    .where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId)));

  return { liked, likeCount: result.count };
}
