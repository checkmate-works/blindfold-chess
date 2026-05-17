'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { db, feedItems, positions, puzzleSolutions } from '@/lib/db';
import { notifyFollowersOfNewPosition } from '@/lib/notifications/notification';
import { grantPointsForPost } from '@/lib/points';
import { validateForkSource } from '@/lib/positions/fork';
import { validateAndDedupeTagIds } from '@/lib/positions/tag-validation';
import { insertPositionTags } from '@/lib/positions/tag-writes';
import { normalizePuzzleMoves, validatePuzzleMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

export type CreatePuzzleResult =
  | {
      success: true;
      id: string;
      /**
       * Present when the create awarded points. Callers route the user
       * through `/thanks?pointEventId=...&returnUrl=...` so the Thanks page
       * can show how many points were earned.
       */
      pointGrant?: { pointEventId: string; amount: number };
    }
  | { error: string };

export async function createPuzzle(data: {
  fen: string;
  title: string;
  description?: string | null;
  solutionMoves: Array<{ san: string; note?: string | null }>;
  /**
   * Optional theme tags (glossary terms with `is_theme = true`) to
   * attach to the new position. Validated against the database before
   * the insert transaction begins so a bad ID rejects the whole create
   * up-front rather than failing partway in.
   */
  themeIds?: string[];
  /** Optional chunk tags (non-soft-deleted) to attach. */
  chunkIds?: string[];
  /**
   * When forking from an existing puzzle, the id of the source row.
   * Validated against the database (must exist, share `type='puzzle'`,
   * not be soft-deleted, not be owned by the current user, and not have
   * `forks_disabled_at` set) before the insert begins.
   */
  forkedFromId?: string | null;
}): Promise<CreatePuzzleResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.createPuzzle);

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

  let resolvedForkedFromId: string | null = null;
  if (data.forkedFromId) {
    const forkCheck = await validateForkSource({
      forkedFromId: data.forkedFromId,
      currentUserId: user.id,
      type: 'puzzle',
    });
    if (!forkCheck.ok) {
      return { error: `fork_source_${forkCheck.reason}` };
    }
    resolvedForkedFromId = forkCheck.source.id;
  }

  const tagValidation = await validateAndDedupeTagIds({
    themeIds: data.themeIds,
    chunkIds: data.chunkIds,
  });
  if (!tagValidation.ok) {
    return { error: tagValidation.error };
  }
  const { themeIds: dedupedThemeIds, chunkIds: dedupedChunkIds } = tagValidation.deduped;

  const txResult = await db.transaction(async (tx) => {
    const [position] = await tx
      .insert(positions)
      .values({
        fen: data.fen.trim(),
        title: data.title.trim(),
        description: data.description?.trim() || null,
        userId: user.id,
        type: 'puzzle',
        forkedFromId: resolvedForkedFromId,
      })
      .returning({ id: positions.id });

    await tx.insert(puzzleSolutions).values({
      positionId: position.id,
      solutionMoves: normalizedMoves,
    });

    await insertPositionTags(tx, position.id, user.id, dedupedThemeIds, dedupedChunkIds);

    await tx.insert(feedItems).values({
      entityType: 'position',
      entityId: position.id,
      actorId: user.id,
      metadata: { type: 'puzzle' },
    });

    // Award points for the new puzzle — immediately spendable.
    const pointGrant = await grantPointsForPost(tx, user.id, {
      type: 'puzzle',
      id: position.id,
    });

    return { position, pointGrant };
  });

  notifyFollowersOfNewPosition({
    actorId: user.id,
    positionId: txResult.position.id,
    positionType: 'puzzle',
  });

  logActivityEvent({
    userId: user.id,
    action: 'create_puzzle',
    targetType: 'position',
    targetId: txResult.position.id,
    metadata: { type: 'puzzle' },
  });

  revalidatePath('/practice/puzzle');

  return {
    success: true,
    id: txResult.position.id,
    ...(txResult.pointGrant
      ? {
          pointGrant: {
            pointEventId: txResult.pointGrant.pointEventId,
            amount: txResult.pointGrant.amount,
          },
        }
      : {}),
  };
}
