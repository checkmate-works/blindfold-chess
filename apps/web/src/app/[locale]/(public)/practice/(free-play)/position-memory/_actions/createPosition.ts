'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { db, feedItems, positions } from '@/lib/db';
import { notifyFollowersOfNewPosition } from '@/lib/notifications/notification';
import { validateForkSource } from '@/lib/positions/fork';
import { validateAndDedupeTagIds } from '@/lib/positions/tag-validation';
import { insertPositionTags } from '@/lib/positions/tag-writes';
import { validatePositionMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';
import { applyAutomatedGrant } from '@/lib/users/user-grants';

export type CreatePositionResult =
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

  let grantInfo: { grantId: string; expiresAt: Date } | null = null;
  const inserted = await db.transaction(async (tx) => {
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

    // Automated 'topic_post' grant for creating a position-memory position.
    // Same grantType as comment-driven grants so duration and stacking flow
    // through one pipeline; sourceType='position' distinguishes the trigger
    // surface for /thanks copy resolution and future targeted revocation.
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
    positionType: 'memory',
  });

  logActivityEvent({
    userId: user.id,
    action: 'create_position',
    targetType: 'position',
    targetId: inserted.id,
    metadata: { type: 'memory' },
  });

  revalidatePath('/practice/position-memory');

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
