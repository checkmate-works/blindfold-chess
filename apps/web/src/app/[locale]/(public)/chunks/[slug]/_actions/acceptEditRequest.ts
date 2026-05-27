'use server';

import type { ResolveEditRequestResult } from '@/lib/chunk-edit-requests/mutations';
import { acceptEditRequestEntry } from '@/lib/chunk-edit-requests/mutations';

/**
 * Accept a pending edit request. Chunk owner only; the underlying entry
 * applies the proposed fields to the chunk in the same transaction
 * (draft chunks only).
 */
export async function acceptEditRequest(requestId: string): Promise<ResolveEditRequestResult> {
  return acceptEditRequestEntry(requestId);
}
