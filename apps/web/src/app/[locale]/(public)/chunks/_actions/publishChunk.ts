'use server';

import type { UpdateChunkResult } from '@/lib/chunks/user-chunk-mutations';
import { publishChunkEntry } from '@/lib/chunks/user-chunk-mutations';

/**
 * Transition a chunk from `draft` to `published`. Owner-only and
 * idempotent — re-publishing an already-published row is a safe no-op.
 */
export async function publishChunk(id: string): Promise<UpdateChunkResult> {
  return publishChunkEntry(id);
}
