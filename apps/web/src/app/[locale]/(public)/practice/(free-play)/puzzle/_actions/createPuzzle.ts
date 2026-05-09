'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { and, eq, inArray, isNull } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import {
  chunks,
  db,
  feedItems,
  glossaryTerms,
  positionChunks,
  positionThemes,
  positions,
  puzzleSolutions,
} from '@/lib/db';
import { GRANT_TYPE_DEFAULTS } from '@/lib/db/data/grant-types';
import { createNotification, notifyFollowersOfNewPosition } from '@/lib/notifications/notification';
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

  // Same defensive validation as updatePuzzle: the application connects
  // with service-role-equivalent privileges so the RLS predicates on
  // position_themes / position_chunks (is_theme = true,
  // chunks.deleted_at IS NULL) do not fire — re-assert here.
  const dedupedThemeIds = data.themeIds ? Array.from(new Set(data.themeIds)) : undefined;
  const dedupedChunkIds = data.chunkIds ? Array.from(new Set(data.chunkIds)) : undefined;

  if (dedupedThemeIds && dedupedThemeIds.length > 0) {
    const validThemes = await db
      .select({ id: glossaryTerms.id })
      .from(glossaryTerms)
      .where(and(inArray(glossaryTerms.id, dedupedThemeIds), eq(glossaryTerms.isTheme, true)));
    if (validThemes.length !== dedupedThemeIds.length) {
      return { error: 'invalidTheme' };
    }
  }

  if (dedupedChunkIds && dedupedChunkIds.length > 0) {
    const validChunks = await db
      .select({ id: chunks.id })
      .from(chunks)
      .where(and(inArray(chunks.id, dedupedChunkIds), isNull(chunks.deletedAt)));
    if (validChunks.length !== dedupedChunkIds.length) {
      return { error: 'invalidChunk' };
    }
  }

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
      })
      .returning({ id: positions.id });

    await tx.insert(puzzleSolutions).values({
      positionId: position.id,
      solutionMoves: normalizedMoves,
    });

    if (dedupedThemeIds && dedupedThemeIds.length > 0) {
      await tx.insert(positionThemes).values(
        dedupedThemeIds.map((termId) => ({
          positionId: position.id,
          termId,
          attachedByUserId: user.id,
        }))
      );
    }

    if (dedupedChunkIds && dedupedChunkIds.length > 0) {
      await tx.insert(positionChunks).values(
        dedupedChunkIds.map((chunkId) => ({
          positionId: position.id,
          chunkId,
          attachedByUserId: user.id,
        }))
      );
    }

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
    const info: { grantId: string; expiresAt: Date } = grantInfo;
    const grantTypeConfig = GRANT_TYPE_DEFAULTS.topic_post;
    createNotification({
      userId: user.id,
      type: 'benefit_grant',
      targetType: 'user_grant',
      targetId: info.grantId,
      metadata: {
        grantType: 'topic_post',
        benefitType: grantTypeConfig.benefitType,
        durationDays: grantTypeConfig.durationDays,
        expiresAt: info.expiresAt.toISOString(),
        reason: null,
      },
    });
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
