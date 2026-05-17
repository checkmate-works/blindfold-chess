'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, positions } from '@/lib/db';
import { clawbackPointsForPost } from '@/lib/points';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

/**
 * User-facing puzzle soft-delete.
 *
 * Restricts to `type = 'puzzle'` so a memory position can never be removed
 * through this entry point even if a caller passes its id. Admin-side
 * deletion (which records a `moderation_actions` row) lives separately under
 * `apps/web/src/app/admin/positions/puzzle/_actions/deletePuzzle.ts`.
 */
export async function deletePuzzle(puzzleId: string, locale: string): Promise<ActionResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.deletePuzzle);
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
    .where(eq(positions.id, puzzleId))
    .limit(1);

  if (!position || position.type !== 'puzzle') {
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
        and(eq(positions.id, puzzleId), eq(positions.userId, user.id), isNull(positions.deletedAt))
      );

    // Reverse the creation point grant for the removed puzzle. Capped at
    // the author's current `earned` balance (see `clawbackPointsForPost`),
    // so coins already spent are not pursued — the balance never goes
    // negative and self-deletion never lands a user in debt.
    await clawbackPointsForPost(tx, user.id, { type: 'puzzle', id: puzzleId });
  });

  logActivityEvent({
    userId: user.id,
    action: 'delete_puzzle',
    targetType: 'position',
    targetId: puzzleId,
    metadata: { type: 'puzzle', title: position.title },
  });

  revalidatePath(`/${locale}/practice/puzzle`);
  revalidatePath(`/${locale}/practice/puzzle/${puzzleId}`);

  return { success: true };
}
