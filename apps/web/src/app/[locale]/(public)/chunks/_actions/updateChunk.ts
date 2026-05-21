'use server';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { UpdateChunkResult } from '@/lib/chunks/user-chunk-mutations';
import { updateChunkEntry } from '@/lib/chunks/user-chunk-mutations';

/**
 * Public-facing wrapper around `updateChunkEntry`. Slug is intentionally
 * NOT accepted — chunks are catalog URLs and the slug is fixed at
 * creation. `userId` is filled from the authenticated session inside
 * `updateChunkEntry`, so it is also omitted from the input.
 */
export async function updateChunk(
  id: string,
  input: {
    representativeFen: string;
    title: string;
    description?: string | null;
    annotations?: BoardAnnotations;
  }
): Promise<UpdateChunkResult> {
  return updateChunkEntry(id, {
    representativeFen: input.representativeFen,
    title: input.title,
    description: input.description,
    annotations: input.annotations,
    userId: '',
  });
}
