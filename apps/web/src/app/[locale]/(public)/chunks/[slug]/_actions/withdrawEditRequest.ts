'use server';

import type { ResolveEditRequestResult } from '@/lib/chunk-edit-requests/mutations';
import { withdrawEditRequestEntry } from '@/lib/chunk-edit-requests/mutations';

/**
 * Withdraw a pending edit request. Proposer only; legal regardless of
 * the chunk's current lifecycle state (the proposer can always rescind
 * their own suggestion).
 */
export async function withdrawEditRequest(requestId: string): Promise<ResolveEditRequestResult> {
  return withdrawEditRequestEntry(requestId);
}
