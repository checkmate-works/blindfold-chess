'use server';

import { revalidatePath } from 'next/cache';

import type { MutationResult } from '@/app/admin/_lib/action-factories';
import { requireAdmin } from '@/app/admin/_lib/auth';
import { eq } from 'drizzle-orm';

import type { ChunkMutationData } from '@/lib/chunks/validation';
import { validateChunkMutationData } from '@/lib/chunks/validation';
import { chunks, db, profiles } from '@/lib/db';

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

  // Verify the specified user exists in the profiles table.
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, data.userId.trim()))
    .limit(1);

  if (!profile) {
    return { error: 'User not found' };
  }

  const [chunk] = await db
    .insert(chunks)
    .values({
      representativeFen: data.representativeFen.trim(),
      title: data.title.trim(),
      description: data.description?.trim() || null,
      // The admin specifies the author via the form — this allows creating
      // chunks on behalf of any user. The form-supplied userId is validated
      // against the profiles table above.
      userId: data.userId.trim(),
    })
    .returning({ id: chunks.id });

  revalidatePath('/admin/chunks');

  return { success: true, id: chunk.id };
}
