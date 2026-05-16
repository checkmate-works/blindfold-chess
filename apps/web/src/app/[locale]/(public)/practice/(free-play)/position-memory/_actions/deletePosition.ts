'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, positions } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

/**
 * User-facing position-memory soft-delete.
 *
 * Restricts to `type = 'memory'` so that a puzzle id passed through this
 * entry point is rejected with `notFound`, matching the symmetric guard in
 * `deletePuzzle`. Admin-side deletion (which records a `moderation_actions`
 * row) lives separately under
 * `apps/web/src/app/admin/positions/memory/_actions/deletePosition.ts`.
 */
export async function deletePosition(positionId: string, locale: string): Promise<ActionResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.deletePosition);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      type: positions.type,
      title: positions.title,
      deletedAt: positions.deletedAt,
    })
    .from(positions)
    .where(eq(positions.id, positionId))
    .limit(1);

  if (!position || position.type !== 'memory') {
    return { error: 'notFound' };
  }

  if (position.userId !== user.id) {
    return { error: 'unauthorized' };
  }

  if (position.deletedAt) {
    return { error: 'alreadyDeleted' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(positions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(positions.id, positionId),
          eq(positions.userId, user.id),
          isNull(positions.deletedAt)
        )
      );

    // No point clawback on user self-deletion — users keep the coins they
    // earned for their own contributions.
  });

  logActivityEvent({
    userId: user.id,
    action: 'delete_position',
    targetType: 'position',
    targetId: positionId,
    metadata: { type: 'memory', title: position.title },
  });

  revalidatePath(`/${locale}/practice/position-memory`);
  revalidatePath(`/${locale}/practice/position-memory/${positionId}`);

  return { success: true };
}
