'use server';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { CreateChunkResult } from '@/lib/chunks/user-chunk-mutations';
import { createChunkEntry } from '@/lib/chunks/user-chunk-mutations';
import type { ChunkStatus } from '@/lib/chunks/validation';

/**
 * Public-facing wrapper around `createChunkEntry`.
 *
 * `userId` is intentionally absent from the input — the underlying entry
 * function pulls the authenticated user from Supabase auth and overwrites
 * whatever the client supplied, so accepting it here would just create a
 * confusing spoof surface.
 *
 * `status` defaults to `'draft'` when omitted to push the UGC flow toward
 * the workshop state (where collaborative naming via edit suggestions
 * lands in a follow-up phase). The user can flip the form toggle to
 * publish immediately if they want.
 */
export async function createChunk(input: {
  representativeFen: string;
  title: string;
  slug: string;
  description?: string | null;
  annotations?: BoardAnnotations;
  status?: ChunkStatus;
}): Promise<CreateChunkResult> {
  return createChunkEntry({
    representativeFen: input.representativeFen,
    title: input.title,
    slug: input.slug,
    description: input.description,
    annotations: input.annotations,
    status: input.status ?? 'draft',
    // userId is overwritten inside `createChunkEntry` from the
    // authenticated Supabase user; the empty string is a placeholder so
    // the shared `ChunkMutationData` shape stays satisfied.
    userId: '',
  });
}
