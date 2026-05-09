'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, positions, puzzleSolutions } from '@/lib/db';
import { normalizePuzzleMoves, validatePuzzleMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

export type UpdatePuzzleResult = { success: true } | { error: string };

/**
 * Update a puzzle. All authoring fields (title, description, FEN, solution
 * moves) are mutable, matching the convention used by issue trackers, forums,
 * and Q&A platforms (GitHub, Discourse, Stack Overflow): the author retains
 * full editorial control, an "(edited)" marker is surfaced on the detail
 * page, and any drift between an edited puzzle and existing comments is
 * left to readers to interpret in light of that marker.
 *
 * The `puzzle_solutions` row is replaced wholesale (delete + insert in the
 * same transaction) rather than diff-applied — there is at most one row per
 * puzzle in normal use, and replacing keeps the action symmetric with
 * `createPuzzle`.
 */
export async function updatePuzzle(data: {
  id: string;
  fen: string;
  title: string;
  description?: string | null;
  solutionMoves: Array<{ san: string; note?: string | null }>;
}): Promise<UpdatePuzzleResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.updatePuzzle);

  if ('error' in guardResult) {
    return { error: guardResult.error };
  }

  const { user } = guardResult;

  const normalizedMoves = normalizePuzzleMoves(data.solutionMoves);

  const validationError = validatePuzzleMutationData({
    fen: data.fen,
    title: data.title,
    description: data.description,
    solutionMoves: normalizedMoves,
    userId: user.id,
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

  await db.transaction(async (tx) => {
    await tx
      .update(positions)
      .set({
        fen: data.fen.trim(),
        title: data.title.trim(),
        description: data.description?.trim() || null,
      })
      .where(
        and(eq(positions.id, data.id), eq(positions.userId, user.id), isNull(positions.deletedAt))
      );

    await tx.delete(puzzleSolutions).where(eq(puzzleSolutions.positionId, data.id));
    await tx.insert(puzzleSolutions).values({
      positionId: data.id,
      solutionMoves: normalizedMoves,
    });
  });

  logActivityEvent({
    userId: user.id,
    action: 'update_puzzle',
    targetType: 'position',
    targetId: data.id,
    metadata: { type: 'puzzle' },
  });

  revalidatePath('/practice/puzzle');
  revalidatePath(`/practice/puzzle/${data.id}`);

  return { success: true };
}
