import { revalidatePath } from 'next/cache';

import type { DeleteResult } from '@/app/admin/_lib/action-factories';
import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq, isNull } from 'drizzle-orm';

import { db, moderationActions, positions } from '@/lib/db';
import { getClientIp } from '@/lib/security/client-ip';

type SoftDeletePositionConfig = {
  /** Paths to revalidate after a successful delete. */
  revalidatePaths: readonly string[];
  /**
   * When true, rows with `deletedAt IS NOT NULL` are observed as not found.
   * This is the idempotency guard so a second delete attempt does not append
   * another `moderation_actions` row for the same target.
   */
  excludeAlreadyDeleted?: boolean;
};

/**
 * Shared soft-delete + audit-log logic for admin position delete actions
 * (`deletePuzzle`, `deletePosition`). Per CLAUDE.md, the base function lives
 * in a plain module and each `'use server'` action file wraps it in an async
 * function declaration.
 */
export async function softDeletePosition(
  id: string,
  config: SoftDeletePositionConfig
): Promise<DeleteResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  if (!id) {
    return { error: 'Position ID is required' };
  }

  const where = config.excludeAlreadyDeleted
    ? and(eq(positions.id, id), isNull(positions.deletedAt))
    : eq(positions.id, id);

  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      type: positions.type,
      fen: positions.fen,
      title: positions.title,
    })
    .from(positions)
    .where(where)
    .limit(1);

  if (!position) {
    return { error: 'Position not found' };
  }

  const ipAddress = await getClientIp();

  await db.transaction(async (tx) => {
    await tx.update(positions).set({ deletedAt: new Date() }).where(eq(positions.id, id));

    await tx.insert(moderationActions).values({
      actorId: auth.userId,
      action: 'delete_position',
      targetType: 'position',
      targetId: id,
      reason: null,
      metadata: {
        positionType: position.type,
        fen: position.fen,
        title: position.title,
        authorId: position.userId,
      },
      ipAddress,
    });
  });

  for (const path of config.revalidatePaths) {
    revalidatePath(path);
  }

  return { success: true };
}
