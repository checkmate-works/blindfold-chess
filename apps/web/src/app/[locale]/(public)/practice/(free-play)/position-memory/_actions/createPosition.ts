'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { db, feedItems, positions } from '@/lib/db';
import { GRANT_TYPE_DEFAULTS } from '@/lib/db/data/grant-types';
import { createNotification, notifyFollowersOfNewPosition } from '@/lib/notifications/notification';
import { validatePositionMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
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
      })
      .returning({ id: positions.id });

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
    positionType: 'memory',
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
