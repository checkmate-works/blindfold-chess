'use server';

import type { ResolvePositionEditRequestResult } from '@/lib/position-edit-requests/mutations';
import { rejectPositionEditRequestEntry } from '@/lib/position-edit-requests/mutations';

/**
 * Reject a pending position edit request without applying it. Position
 * owner only.
 */
export async function rejectPositionEditRequest(
  requestId: string
): Promise<ResolvePositionEditRequestResult> {
  return rejectPositionEditRequestEntry(requestId);
}
