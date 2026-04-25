'use server';

import { revalidatePath } from 'next/cache';

import type { MutationResult } from '@/app/admin/_lib/action-factories';
import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq, isNull } from 'drizzle-orm';

import type { ChunkMutationData } from '@/lib/chunks/validation';
import { validateChunkMutationData } from '@/lib/chunks/validation';
import { chunks, db, profiles } from '@/lib/db';

// NOTE: kept hand-written (not using adminMutationGuard factory) for
// consistency with createChunk. See createChunk.ts for context.
export async function updateChunk(id: string, data: ChunkMutationData): Promise<MutationResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  if (!id) {
    return { error: 'Chunk ID is required' };
  }

  const validationError = validateChunkMutationData(data);
  if (validationError) {
    return { error: validationError };
  }

  // Soft-deleted chunks are excluded here so that reviving a logically
  // deleted row requires a dedicated restore flow rather than a silent
  // UPDATE. The admin UI hides the edit affordance for deleted rows, but
  // this guard also protects direct Server Action invocations.
  const [existing] = await db
    .select({ id: chunks.id })
    .from(chunks)
    .where(and(eq(chunks.id, id), isNull(chunks.deletedAt)))
    .limit(1);

  if (!existing) {
    return { error: 'Chunk not found' };
  }

  // Verify the specified user exists in the profiles table.
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, data.userId.trim()))
    .limit(1);

  if (!profile) {
    return { error: 'User not found' };
  }

  await db
    .update(chunks)
    .set({
      representativeFen: data.representativeFen.trim(),
      title: data.title.trim(),
      slug: data.slug.trim(),
      description: data.description?.trim() || null,
      userId: data.userId.trim(),
    })
    .where(eq(chunks.id, id));

  revalidatePath('/admin/chunks');
  revalidatePath(`/admin/chunks/${id}/edit`);

  return { success: true, id };
}
