'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, positions } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

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

  await db
    .update(positions)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(positions.id, puzzleId), eq(positions.userId, user.id), isNull(positions.deletedAt))
    );

  revalidatePath(`/${locale}/practice/puzzle`);
  revalidatePath(`/${locale}/practice/puzzle/${puzzleId}`);

  return { success: true };
}
