'use server';

import { revalidatePath } from 'next/cache';

import type { MutationResult } from '@/app/admin/_lib/action-factories';
import { requireAdmin } from '@/app/admin/_lib/auth';

import { buildChunkMutationValues, verifyChunkAuthor } from '@/lib/chunks/mutation-helpers';
import type { ChunkMutationData } from '@/lib/chunks/validation';
import { validateChunkMutationData } from '@/lib/chunks/validation';
import { chunks, db } from '@/lib/db';

// NOTE: this action does not use `adminMutationGuard` / `mutationSuccess`
// factories because it needs to validate the user_id from the form and
// verify the user exists in the profiles table. The current factory
// signature does not support this. Once `adminMutationGuard` is extended
// (follow-up issue), this file and `createPosition.ts` should migrate to
// the factory pattern.
export async function createChunk(data: ChunkMutationData): Promise<MutationResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const validationError = validateChunkMutationData(data);
  if (validationError) {
    return { error: validationError };
  }

  const authorError = await verifyChunkAuthor(data.userId);
  if (authorError) {
    return authorError;
  }

  const [chunk] = await db
    .insert(chunks)
    .values(buildChunkMutationValues(data))
    .returning({ id: chunks.id });

  revalidatePath('/admin/chunks');

  return { success: true, id: chunk.id };
}
