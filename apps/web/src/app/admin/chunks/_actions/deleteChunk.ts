'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteResult } from '@/app/admin/_lib/action-factories';
import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq, isNull } from 'drizzle-orm';

import { chunks, db, moderationActions } from '@/lib/db';
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

    await tx.insert(moderationActions).values({
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
  revalidatePath(`/admin/chunks/${id}/edit`);
  return { success: true };
}
