import { and, eq, inArray, isNull } from 'drizzle-orm';

import { chunks, glossaryTerms } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import { insertPositionTags } from '@/lib/positions/tag-writes';

/**
 * The subset of a `position_edit_requests` row this helper reads. Defined
 * structurally so callers can pass either the full row or a narrow
 * selection.
 */
type PositionEditProposal = {
  proposedThemeIds: string[];
  proposedChunkIds: string[];
};

/**
 * The position's live tag sets, read inside the same transaction before any
 * apply. The caller already loads these to persist `resolved_base_*_ids`,
 * so they are passed in rather than re-queried.
 */
type LiveTagSets = {
  baseThemeIds: string[];
  baseChunkIds: string[];
};

/** IDs in `proposed` that survive validation and aren't already linked. */
function newIds(proposed: string[], valid: Set<string>, live: string[]): string[] {
  const liveSet = new Set(live);
  return Array.from(new Set(proposed)).filter((id) => valid.has(id) && !liveSet.has(id));
}

/**
 * Apply an accepted position edit-request proposal: insert the proposed
 * theme / chunk links that aren't already present. Called from inside the
 * same transaction as the `position_edit_requests` status flip so the
 * audit-trail update and the content change commit together; the
 * positions-row FOR UPDATE lock taken at the start of the transaction
 * serializes concurrent accepts on the same position, so the
 * "not already linked" filter below cannot race into a PK conflict.
 *
 * @design additive — insert only, never replace
 * Proposals carry only the tags to ADD (see the `position_edit_requests`
 * schema TSDoc), so this inserts the genuinely-new IDs and leaves every
 * existing junction row untouched. Two consequences worth keeping: an
 * accept can never revert a tag the owner added after the proposal was
 * submitted, and pre-existing rows keep their original
 * `attached_by_user_id` instead of being re-attributed to the accepting
 * owner. `resolverId` is recorded as the attacher on the new rows only.
 *
 * @design re-validate at accept time
 * The proposed IDs were validated at submit time, but a chunk can be
 * unpublished / soft-deleted and a glossary term can lose `is_theme` in the
 * interval before the owner accepts. We re-filter against the live catalogs
 * here and apply only the still-valid IDs, so accepting can never insert a
 * junction row pointing at a tag that is no longer publicly available.
 * Invalid IDs are dropped silently — the owner can re-review if the result
 * looks off.
 */
export async function applyAcceptedPositionProposal(
  tx: DbTx,
  request: PositionEditProposal,
  live: LiveTagSets,
  positionId: string,
  resolverId: string
): Promise<void> {
  const proposedThemes = Array.from(new Set(request.proposedThemeIds));
  const proposedChunks = Array.from(new Set(request.proposedChunkIds));

  let validThemeIds = new Set<string>();
  if (proposedThemes.length > 0) {
    const rows = await tx
      .select({ id: glossaryTerms.id })
      .from(glossaryTerms)
      .where(and(inArray(glossaryTerms.id, proposedThemes), eq(glossaryTerms.isTheme, true)));
    validThemeIds = new Set(rows.map((row) => row.id));
  }

  let validChunkIds = new Set<string>();
  if (proposedChunks.length > 0) {
    const rows = await tx
      .select({ id: chunks.id })
      .from(chunks)
      .where(
        and(
          inArray(chunks.id, proposedChunks),
          isNull(chunks.deletedAt),
          eq(chunks.status, 'published')
        )
      );
    validChunkIds = new Set(rows.map((row) => row.id));
  }

  await insertPositionTags(
    tx,
    positionId,
    resolverId,
    newIds(proposedThemes, validThemeIds, live.baseThemeIds),
    newIds(proposedChunks, validChunkIds, live.baseChunkIds)
  );
}
