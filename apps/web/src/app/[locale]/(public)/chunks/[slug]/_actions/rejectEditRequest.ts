'use server';

import type { ResolveEditRequestResult } from '@/lib/chunk-edit-requests/mutations';
import { rejectEditRequestEntry } from '@/lib/chunk-edit-requests/mutations';

/**
 * Reject a pending edit request. Chunk owner only; the optional comment
 * surfaces back to the proposer as the resolver's response.
 */
export async function rejectEditRequest(
  requestId: string,
  resolverComment?: string | null
): Promise<ResolveEditRequestResult> {
  return rejectEditRequestEntry(requestId, resolverComment);
}
