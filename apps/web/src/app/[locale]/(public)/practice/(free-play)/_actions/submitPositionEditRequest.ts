'use server';

import type { SubmitPositionEditRequestResult } from '@/lib/position-edit-requests/mutations';
import { submitPositionEditRequestEntry } from '@/lib/position-edit-requests/mutations';

/**
 * Submit a Qiita-style chunk-link edit request against a position (memory /
 * puzzle). Authenticated non-owner only; the underlying entry enforces the
 * non-deleted-position, one-pending, and published-chunk-set semantics.
 */
export async function submitPositionEditRequest(input: {
  positionId: string;
  proposedChunkIds: string[];
  comment?: string | null;
}): Promise<SubmitPositionEditRequestResult> {
  return submitPositionEditRequestEntry({
    positionId: input.positionId,
    payload: {
      proposedChunkIds: input.proposedChunkIds,
      comment: input.comment,
    },
  });
}
