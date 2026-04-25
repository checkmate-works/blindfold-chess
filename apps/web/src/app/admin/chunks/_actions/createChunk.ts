'use server';

import { revalidatePath } from 'next/cache';

import type { MutationResult } from '@/app/admin/_lib/action-factories';
import { requireAdmin } from '@/app/admin/_lib/auth';

import type { ChunkMutationData } from '@/lib/chunks/validation';
import { validateChunkMutationData } from '@/lib/chunks/validation';
import { chunks, db } from '@/lib/db';

// NOTE: this action does not use `adminMutationGuard` / `mutationSuccess`
// factories because it needs the authenticated admin's userId to populate
// `chunks.user_id`, and the current factory signature does not return it.
// Once `adminMutationGuard` is extended to return { userId } (follow-up issue),
// this file and `createPosition.ts` should migrate to the factory pattern.
export async function createChunk(data: ChunkMutationData): Promise<MutationResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const validationError = validateChunkMutationData(data);
  if (validationError) {
    return { error: validationError };
  }

  const [chunk] = await db
    .insert(chunks)
    .values({
      representativeFen: data.representativeFen.trim(),
      title: data.title.trim(),
      description: data.description?.trim() || null,
      // Chunks are a curated catalog where the admin's identity is the source
      // of truth — the admin is always the author. This differs from
      // createPosition which accepts user_id from the form (admin acting as a
      // proxy for another user). See the @design note on the `chunks` table
      // in schema/tables.ts.
      userId: auth.userId,
    })
    .returning({ id: chunks.id });

  revalidatePath('/admin/chunks');

  return { success: true, id: chunk.id };
}
