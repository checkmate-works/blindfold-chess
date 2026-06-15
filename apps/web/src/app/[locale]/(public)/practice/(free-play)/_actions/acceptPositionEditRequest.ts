'use server';

import type { ResolvePositionEditRequestResult } from '@/lib/position-edit-requests/mutations';
import { acceptPositionEditRequestEntry } from '@/lib/position-edit-requests/mutations';

/**
 * Accept a pending position edit request. Position owner only; the
 * underlying entry replaces the position's linked-chunk set with the
 * proposed set in the same transaction.
 */
export async function acceptPositionEditRequest(
  requestId: string
): Promise<ResolvePositionEditRequestResult> {
  return acceptPositionEditRequestEntry(requestId);
}
