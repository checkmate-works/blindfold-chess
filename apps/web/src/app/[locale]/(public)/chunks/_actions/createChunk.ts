'use server';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { CreateChunkResult } from '@/lib/chunks/user-chunk-mutations';
import { createChunkEntry } from '@/lib/chunks/user-chunk-mutations';

/**
 * Public-facing wrapper around `createChunkEntry`.
 *
 * `userId` is intentionally absent from the input — the underlying entry
 * function pulls the authenticated user from Supabase auth and overwrites
 * whatever the client supplied, so accepting it here would just create a
 * confusing spoof surface.
 */
export async function createChunk(input: {
  representativeFen: string;
  title: string;
  slug: string;
  description?: string | null;
  annotations?: BoardAnnotations;
}): Promise<CreateChunkResult> {
  return createChunkEntry({
    representativeFen: input.representativeFen,
    title: input.title,
    slug: input.slug,
    description: input.description,
    annotations: input.annotations,
    // userId is overwritten inside `createChunkEntry` from the
    // authenticated Supabase user; the empty string is a placeholder so
    // the shared `ChunkMutationData` shape stays satisfied.
    userId: '',
  });
}
