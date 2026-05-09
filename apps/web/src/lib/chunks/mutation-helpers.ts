import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';

import type { ChunkMutationData } from './validation';

/**
 * Map a `ChunkMutationData` payload onto the column values shared by both
 * `createChunk` (INSERT) and `updateChunk` (UPDATE).
 *
 * The admin form validates trimmed values, so the same trimming is applied
 * here to keep stored data consistent regardless of incidental whitespace.
 */
export function buildChunkMutationValues(data: ChunkMutationData) {
  return {
    representativeFen: data.representativeFen.trim(),
    title: data.title.trim(),
    slug: data.slug.trim(),
    description: data.description?.trim() || null,
    userId: data.userId.trim(),
  };
}

/**
 * Confirm the supplied `userId` resolves to a row in `profiles`.
 *
 * Both `createChunk` and `updateChunk` accept the author id from the admin
 * form, so the existence check guards against a typo or stale UI state from
 * persisting an orphan FK reference.
 */
export async function verifyChunkAuthor(userId: string): Promise<{ error: string } | null> {
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, userId.trim()))
    .limit(1);

  return profile ? null : { error: 'User not found' };
}
