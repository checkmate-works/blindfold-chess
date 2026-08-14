'use server';

// eslint-disable-next-line no-restricted-imports -- AdminDeleteButton has no router.refresh(); this revalidate is the only thing that removes the deleted row from the /admin/chunks list
import { revalidatePath } from 'next/cache';

import type { DeleteResult } from '@/app/admin/_lib/action-factories';
import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq, isNull } from 'drizzle-orm';

import { chunks, db } from '@/lib/db';
import { logModerationAction } from '@/lib/moderation/audit';
import { getClientIp } from '@/lib/security/client-ip';

export async function deleteChunk(id: string): Promise<DeleteResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  if (!id) {
    return { error: 'Chunk ID is required' };
  }

  // Idempotency guard: rows with `deletedAt IS NOT NULL` are treated as
  // non-existent here so a second delete attempt does not append another
  // `moderation_actions` row for the same target.
  const [chunk] = await db
    .select({
      id: chunks.id,
      userId: chunks.userId,
      representativeFen: chunks.representativeFen,
      title: chunks.title,
    })
    .from(chunks)
    .where(and(eq(chunks.id, id), isNull(chunks.deletedAt)))
    .limit(1);

  if (!chunk) {
    return { error: 'Chunk not found' };
  }

  const ipAddress = await getClientIp();

  await db.transaction(async (tx) => {
    await tx.update(chunks).set({ deletedAt: new Date() }).where(eq(chunks.id, id));

    await logModerationAction(tx, {
      actorId: auth.userId,
      action: 'delete_chunk',
      targetType: 'chunk',
      targetId: id,
      reason: null,
      metadata: {
        representativeFen: chunk.representativeFen,
        title: chunk.title,
        authorId: chunk.userId,
      },
      ipAddress,
    });
  });

  revalidatePath('/admin/chunks');
  return { success: true };
}
