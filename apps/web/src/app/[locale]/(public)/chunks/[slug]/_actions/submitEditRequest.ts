'use server';

import type { SubmitEditRequestResult } from '@/lib/chunk-edit-requests/mutations';
import { submitEditRequestEntry } from '@/lib/chunk-edit-requests/mutations';

/**
 * Submit a Qiita-style edit request against a draft chunk. Authenticated
 * non-owner only; the underlying entry enforces draft-only + at-least-one-
 * changed-field semantics.
 */
export async function submitEditRequest(input: {
  chunkId: string;
  proposedTitle?: string | null;
  proposedDescription?: string | null;
  comment?: string | null;
}): Promise<SubmitEditRequestResult> {
  return submitEditRequestEntry({
    chunkId: input.chunkId,
    payload: {
      proposedTitle: input.proposedTitle,
      proposedDescription: input.proposedDescription,
      comment: input.comment,
    },
  });
}
