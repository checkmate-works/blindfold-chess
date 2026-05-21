'use server';

import type { DeleteChunkResult } from '@/lib/chunks/user-chunk-mutations';
import { deleteChunkEntry } from '@/lib/chunks/user-chunk-mutations';

export async function deleteChunk(id: string): Promise<DeleteChunkResult> {
  return deleteChunkEntry(id);
}
