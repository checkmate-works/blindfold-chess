import { and, eq, isNull } from 'drizzle-orm';

import { chunks } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';

/**
 * The subset of a `chunk_edit_requests` row this helper reads. Defined
 * structurally so callers can pass either the full row or a narrow
 * selection — and so the helper does not pull in the runtime row type
 * (which carries DB-level Date / serial fields the application layer
 * never touches).
 */
type EditProposal = {
  proposedTitle: string | null;
  proposedDescription: string | null;
};

/**
 * Apply the accepted fields of an edit-request proposal to the parent
 * `chunks` row. Called from inside the same transaction as the
 * `chunk_edit_requests` status flip so the audit-trail update and the
 * content change commit together; the chunks-row FOR UPDATE lock at
 * the start of the transaction serializes concurrent accepts on the
 * same chunk so two simultaneous accept-different-suggestions paths
 * cannot interleave.
 *
 * @design Skip columns the proposal does not touch
 * Drizzle treats `undefined` as "skip column", so we build the
 * `updates` object conditionally. Fields the proposal did not include
 * (= `null` on the request row) leave the corresponding `chunks`
 * column untouched. This preserves a partial-proposal contract:
 * accepting a title-only proposal does not blank out a previously-set
 * description.
 *
 * @design proposedDescription === null means "untouched"
 * The original request validator stores `null` when the proposal
 * targeted a different field. An explicit empty description from the
 * proposer arrives as `''` (the empty string), which we DO want to
 * propagate to the chunk (`description` is nullable on `chunks` and
 * an empty string is a legitimate value while the chunk is still in
 * draft).
 */
export async function applyAcceptedProposal(
  tx: DbTx,
  request: EditProposal,
  chunkId: string
): Promise<void> {
  const updates: { title?: string; description?: string | null } = {};
  if (request.proposedTitle !== null) {
    updates.title = request.proposedTitle.trim();
  }
  if (request.proposedDescription !== null) {
    updates.description = request.proposedDescription;
  }
  if (Object.keys(updates).length === 0) return;

  await tx
    .update(chunks)
    .set(updates)
    .where(and(eq(chunks.id, chunkId), isNull(chunks.deletedAt)));
}
