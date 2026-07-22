'use server';

import type { SubmitPositionEditRequestResult } from '@/lib/position-edit-requests/mutations';
import { submitPositionEditRequestEntry } from '@/lib/position-edit-requests/mutations';

/**
 * Submit a Qiita-style tag-link edit request against a position (memory /
 * puzzle), proposing themes and/or chunks to ADD. Authenticated non-owner
 * only; the underlying entry enforces the non-deleted-position, one-pending,
 * adds-something, and valid-tag semantics.
 */
export async function submitPositionEditRequest(input: {
  positionId: string;
  proposedThemeIds: string[];
  proposedChunkIds: string[];
  comment?: string | null;
}): Promise<SubmitPositionEditRequestResult> {
  return submitPositionEditRequestEntry({
    positionId: input.positionId,
    payload: {
      proposedThemeIds: input.proposedThemeIds,
      proposedChunkIds: input.proposedChunkIds,
      comment: input.comment,
    },
  });
}
