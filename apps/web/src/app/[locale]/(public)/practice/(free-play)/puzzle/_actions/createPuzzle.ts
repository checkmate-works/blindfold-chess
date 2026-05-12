'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { db, feedItems, positions, puzzleSolutions } from '@/lib/db';
import { notifyFollowersOfNewPosition } from '@/lib/notifications/notification';
import { validateForkSource } from '@/lib/positions/fork';
import { validateAndDedupeTagIds } from '@/lib/positions/tag-validation';
import { insertPositionTags } from '@/lib/positions/tag-writes';
import { normalizePuzzleMoves, validatePuzzleMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';
import { applyAutomatedGrant } from '@/lib/users/user-grants';

export type CreatePuzzleResult =
  | {
      success: true;
      id: string;
      /**
       * Present when the create triggered an automated `topic_post` grant.
       * Callers route the user through `/thanks?grantId=...&returnUrl=...`
       * in this case; otherwise they fall back to the legacy result page.
       * `expiresAt` is serialized to ISO so the value crosses the
       * server-action JSON boundary unchanged.
       */
      grant?: { grantId: string; expiresAt: string };
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

  let grantInfo: { grantId: string; expiresAt: Date } | null = null;
  const inserted = await db.transaction(async (tx) => {
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

    // Automated 'topic_post' grant for creating a puzzle position. Stays on
    // the same grantType as comment-driven grants so duration policy and
    // benefit stacking flow through one pipeline; sourceType='position'
    // distinguishes the trigger surface for /thanks copy resolution and
    // future targeted revocation if the position is deleted.
    grantInfo = await applyAutomatedGrant(tx, user.id, 'topic_post', {
      type: 'position',
      id: position.id,
    });

    return position;
  });

  if (grantInfo) {
    revalidateTag('grant-status', { expire: 60 });
    // No in-app notification: the client redirects to /thanks on grant, which
    // is the celebration moment. Admin-manual grants (no /thanks) still notify
    // — see admin/grants/_actions/createGrant.ts.
  }

  notifyFollowersOfNewPosition({
    actorId: user.id,
    positionId: inserted.id,
    positionType: 'puzzle',
  });

  logActivityEvent({
    userId: user.id,
    action: 'create_puzzle',
    targetType: 'position',
    targetId: inserted.id,
    metadata: { type: 'puzzle' },
  });

  revalidatePath('/practice/puzzle');

  return {
    success: true,
    id: inserted.id,
    ...(grantInfo
      ? {
          grant: {
            grantId: (grantInfo as { grantId: string; expiresAt: Date }).grantId,
            expiresAt: (grantInfo as { grantId: string; expiresAt: Date }).expiresAt.toISOString(),
          },
        }
      : {}),
  };
}
