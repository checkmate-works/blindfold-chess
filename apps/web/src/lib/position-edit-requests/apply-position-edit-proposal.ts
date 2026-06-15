import { and, eq, inArray, isNull } from 'drizzle-orm';

import { chunks } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import { replacePositionTags } from '@/lib/positions/tag-writes';

/**
 * The subset of a `position_edit_requests` row this helper reads. Defined
 * structurally so callers can pass either the full row or a narrow
 * selection.
 */
type PositionEditProposal = {
  proposedChunkIds: string[];
};

/**
 * Apply an accepted position edit-request proposal: replace the position's
 * linked-chunk set with the proposed set. Called from inside the same
 * transaction as the `position_edit_requests` status flip so the audit-trail
 * update and the content change commit together; the positions-row FOR
 * UPDATE lock taken at the start of the transaction serializes concurrent
 * accepts on the same position.
 *
 * @design re-validate at accept time
 * `proposed_chunk_ids` was validated (published, non-deleted) at submit
 * time, but a chunk can be unpublished / soft-deleted in the interval
 * before the owner accepts. We re-filter the proposed set against the live
 * published / non-deleted chunk catalog here and apply only the still-valid
 * IDs, so accepting can never insert a junction row pointing at a chunk
 * that is no longer publicly available. Invalid IDs are dropped silently —
 * the owner can re-review if the result looks off.
 *
 * @design themes untouched
 * Passing `undefined` for `themeIds` to `replacePositionTags` leaves the
 * position's glossary-theme links alone; only `position_chunks` is
 * rewritten. The accepting owner (`resolverId`) is recorded as
 * `attached_by_user_id` on the new junction rows.
 */
export async function applyAcceptedPositionProposal(
  tx: DbTx,
  request: PositionEditProposal,
  positionId: string,
  resolverId: string
): Promise<void> {
  const proposed = Array.from(new Set(request.proposedChunkIds));

  let validChunkIds: string[] = [];
  if (proposed.length > 0) {
    const rows = await tx
      .select({ id: chunks.id })
      .from(chunks)
      .where(
        and(inArray(chunks.id, proposed), isNull(chunks.deletedAt), eq(chunks.status, 'published'))
      );
    validChunkIds = rows.map((row) => row.id);
  }

  await replacePositionTags(tx, positionId, resolverId, undefined, validChunkIds);
}
