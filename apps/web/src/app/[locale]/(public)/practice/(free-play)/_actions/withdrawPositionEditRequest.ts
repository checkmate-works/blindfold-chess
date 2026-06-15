'use server';

import type { ResolvePositionEditRequestResult } from '@/lib/position-edit-requests/mutations';
import { withdrawPositionEditRequestEntry } from '@/lib/position-edit-requests/mutations';

/**
 * Withdraw the viewer's own pending position edit request. Proposer only;
 * legal regardless of the position's state.
 */
export async function withdrawPositionEditRequest(
  requestId: string
): Promise<ResolvePositionEditRequestResult> {
  return withdrawPositionEditRequestEntry(requestId);
}
