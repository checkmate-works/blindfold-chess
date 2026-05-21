'use server';

import type { UpdateChunkResult } from '@/lib/chunks/user-chunk-mutations';
import { unpublishChunkEntry } from '@/lib/chunks/user-chunk-mutations';

/**
 * Move a chunk back from `published` to `draft` for further revisions.
 * Owner-only and idempotent.
 */
export async function unpublishChunk(id: string): Promise<UpdateChunkResult> {
  return unpublishChunkEntry(id);
}
