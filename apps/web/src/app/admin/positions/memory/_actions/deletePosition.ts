'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteResult } from '@/app/admin/_lib/action-factories';
import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq, isNull } from 'drizzle-orm';

import { db, moderationActions, positions } from '@/lib/db';
import { getClientIp } from '@/lib/security/client-ip';

export async function deletePosition(id: string): Promise<DeleteResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  if (!id) {
    return { error: 'Position ID is required' };
  }

  // Idempotency guard: rows with `deletedAt IS NOT NULL` are treated as
  // non-existent here so a second delete attempt does not append another
  // `moderation_actions` row for the same target.
  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      type: positions.type,
      fen: positions.fen,
      title: positions.title,
    })
    .from(positions)
    .where(and(eq(positions.id, id), isNull(positions.deletedAt)))
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

  revalidatePath('/admin/positions/memory');
  revalidatePath(`/admin/positions/memory/${id}`);
  return { success: true };
}
