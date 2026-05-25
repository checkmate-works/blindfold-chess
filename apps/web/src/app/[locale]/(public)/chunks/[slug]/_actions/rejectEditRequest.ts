'use server';

import type { ResolveEditRequestResult } from '@/lib/chunk-edit-requests/mutations';
import { rejectEditRequestEntry } from '@/lib/chunk-edit-requests/mutations';

/**
 * Reject a pending edit request. Chunk owner only. The rejection is
 * silent — reject is intentionally not notified (see mutation TSDoc
 * for rationale), and the resolver comment column was removed because
 * the only surface that ever read it was the same page the proposer
 * would have to actively revisit.
 */
export async function rejectEditRequest(requestId: string): Promise<ResolveEditRequestResult> {
  return rejectEditRequestEntry(requestId);
}
