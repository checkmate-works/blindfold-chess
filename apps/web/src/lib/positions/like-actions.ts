import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, positions } from '@/lib/db';
import { toggleLikeForTarget } from '@/lib/db/like-actions';
import { createNotification } from '@/lib/notifications/notification';
import { parsePositionType } from '@/lib/positions/types';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
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

  const [position] = await db
    .select({ userId: positions.userId, type: positions.type })
    .from(positions)
    .where(eq(positions.id, positionId))
    .limit(1);
  const positionType = position ? parsePositionType(position.type) : null;

  if (liked && position && position.userId !== user.id) {
    // Include `positionType` in metadata so that the recipient's
    // notification link can be routed to the correct detail page
    // (memory vs puzzle vs sequence). Without this, notifications on
    // puzzle positions would default to the position-memory detail URL
    // and 404. Falls back to omitting `positionType` for defensive
    // safety when the raw DB value is outside the known union.
    createNotification({
      userId: position.userId,
      actorId: user.id,
      type: 'like',
      targetType: 'position',
      targetId: positionId,
      metadata: {
        positionId,
        ...(positionType ? { positionType } : {}),
      },
    });
  }

  // Revalidate the detail page for whichever position type this row is, so
  // a freshly-loaded SSR render reflects the new like count. The list pages
  // are revalidated too, but the puzzle list is paginated/generic enough
  // that `/practice/puzzle` alone is sufficient.
  if (positionType === 'puzzle') {
    revalidatePath(`/${locale}/practice/puzzle`);
    revalidatePath(`/${locale}/practice/puzzle/${positionId}`);
  } else {
    revalidatePath(`/${locale}/practice/position-memory`);
    revalidatePath(`/${locale}/practice/position-memory/${positionId}`);
  }

  return { liked, likeCount };
}
