'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, positions } from '@/lib/db';
import { validatePuzzleMetadataMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type UpdatePuzzleResult = { success: true } | { error: string };

/**
 * Update puzzle metadata (title + description only).
 *
 * The puzzle's `fen` and its `puzzle_solutions` row are intentionally
 * read-only here: editing them would invalidate spoiler-tagged comments
 * and the linked solution moves. Authors who need to fix those should
 * delete the puzzle and re-create it.
 */
export async function updatePuzzle(data: {
  id: string;
  title: string;
  description?: string | null;
}): Promise<UpdatePuzzleResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.updatePuzzle);

  if ('error' in guardResult) {
    return { error: guardResult.error };
  }

  const { user } = guardResult;

  const validationError = validatePuzzleMetadataMutationData({
    title: data.title,
    description: data.description,
  });

  if (validationError) {
    return { error: validationError };
  }

  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      type: positions.type,
      deletedAt: positions.deletedAt,
    })
    .from(positions)
    .where(eq(positions.id, data.id))
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
    .set({
      title: data.title.trim(),
      description: data.description?.trim() || null,
    })
    .where(and(eq(positions.id, data.id), isNull(positions.deletedAt)));

  revalidatePath('/practice/puzzle');
  revalidatePath(`/practice/puzzle/${data.id}`);

  return { success: true };
}
