import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, positions } from '@/lib/db';
import { toggleLikeForTarget } from '@/lib/db/like-actions';
import { createNotification } from '@/lib/notification';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/validations/uuid';

export type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };

/**
 * Core implementation of the "toggle like" operation for a position.
 *
 * Plain (non-"use server") module so it can be imported by Server Actions in
 * multiple routes. The caller must be an async `"use server"` wrapper.
 */
export async function togglePositionLike(
  positionId: string,
  locale: string
): Promise<ToggleLikeResult> {
  if (!UUID_RE.test(positionId)) {
    return { error: 'invalidPositionId' };
  }

  const guardResult = await authenticateAndGuard(RATE_LIMITS.toggleLike);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const { liked, likeCount } = await toggleLikeForTarget({
    userId: user.id,
    targetType: 'position',
    targetId: positionId,
  });

  if (liked) {
    const [position] = await db
      .select({ userId: positions.userId })
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1);

    if (position && position.userId !== user.id) {
      createNotification({
        userId: position.userId,
        actorId: user.id,
        type: 'like',
        targetType: 'position',
        targetId: positionId,
        metadata: { positionId },
      });
    }
  }

  revalidatePath(`/${locale}/practice/position-memory`);
  revalidatePath(`/${locale}/practice/position-memory/${positionId}`);

  return { liked, likeCount };
}
