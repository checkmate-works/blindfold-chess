'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { db, feedItems, positions } from '@/lib/db';
import { notifyFollowersOfNewPosition } from '@/lib/notifications/notification';
import { grantPendingPointsForPost } from '@/lib/points';
import { validateForkSource } from '@/lib/positions/fork';
import { validateAndDedupeTagIds } from '@/lib/positions/tag-validation';
import { insertPositionTags } from '@/lib/positions/tag-writes';
import { validatePositionMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

export type CreatePositionResult =
  | {
      success: true;
      id: string;
      /**
       * Present when the create awarded pending points. Callers route the
       * user through `/thanks?pointEventId=...&returnUrl=...` so the Thanks
       * page can show how many points were earned and the maturation window.
       */
      pointGrant?: { pointEventId: string; amount: number };
    }
  | { error: string };

export async function createPosition(data: {
  fen: string;
  title: string;
  description?: string | null;
  themeIds?: string[];
  chunkIds?: string[];
  /**
   * When forking from an existing position-memory entry, the id of the
   * source row. Validated against the database (must exist, share
   * `type='memory'`, not be soft-deleted, not be owned by the current
   * user, and not have `forks_disabled_at` set) before the insert begins.
   */
  forkedFromId?: string | null;
}): Promise<CreatePositionResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.createPosition);

  if ('error' in guardResult) {
    return { error: guardResult.error };
  }

  const { user } = guardResult;

  const validationError = validatePositionMutationData({
    fen: data.fen,
    title: data.title,
    description: data.description,
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
      type: 'memory',
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
        type: 'memory',
        forkedFromId: resolvedForkedFromId,
      })
      .returning({ id: positions.id });

    await insertPositionTags(tx, position.id, user.id, dedupedThemeIds, dedupedChunkIds);

    await tx.insert(feedItems).values({
      entityType: 'position',
      entityId: position.id,
      actorId: user.id,
      metadata: { type: 'memory' },
    });

    // Award pending points for the new position-memory entry. See
    // grantPendingPointsForPost for lifecycle / clawback semantics.
    const pointGrant = await grantPendingPointsForPost(tx, user.id, {
      type: 'position_memory',
      id: position.id,
    });

    return { position, pointGrant };
  });

  notifyFollowersOfNewPosition({
    actorId: user.id,
    positionId: txResult.position.id,
    positionType: 'memory',
  });

  logActivityEvent({
    userId: user.id,
    action: 'create_position',
    targetType: 'position',
    targetId: txResult.position.id,
    metadata: { type: 'memory' },
  });

  revalidatePath('/practice/position-memory');

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
