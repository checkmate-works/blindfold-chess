import { EDIT_REQUEST_COMMENT_MAX_LENGTH } from '@/lib/edit-requests/shared';
import { UUID_RE } from '@/lib/validations/uuid';

export type SubmitPositionEditRequestPayload = {
  /**
   * Glossary-term IDs the proposer wants to ADD (additive, not an absolute
   * set — see the `position_edit_requests` schema TSDoc). Order does not
   * matter; duplicates are removed.
   */
  proposedThemeIds: string[];
  /** Chunk IDs the proposer wants to ADD. Same semantics as themes. */
  proposedChunkIds: string[];
  /** Optional rationale from the proposer. Length-capped only. */
  comment?: string | null;
};

export type ValidatedPositionEditRequest = {
  /** Deduped theme ID set, ready for the `is_theme` DB check. */
  proposedThemeIds: string[];
  /** Deduped chunk ID set, ready for the existence/published DB check. */
  proposedChunkIds: string[];
  comment: string | null;
};

/**
 * Error codes returned by `validateSubmitPositionEditRequest`. These are
 * localized in the UI (`practice.positionEditRequests.errors.*`) rather
 * than surfaced as English sentences, matching how the guard / mutation
 * layer returns codes (`signInRequired`, `notFound`, …).
 */
export type PositionEditRequestValidationError = 'invalidTagId' | 'nothingToAdd' | 'commentTooLong';

/** Dedupe while rejecting anything that isn't a well-formed UUID. */
function dedupeIds(raw: unknown): string[] | null {
  const list = Array.isArray(raw) ? raw : [];
  const deduped = Array.from(new Set(list));
  for (const id of deduped) {
    if (typeof id !== 'string' || !UUID_RE.test(id)) return null;
  }
  return deduped;
}

/**
 * Validate a submit-time position edit-request payload against the
 * position's current linked-tag sets. This is the pure / synchronous shape
 * check: it dedupes and UUID-validates the proposed IDs, rejects a proposal
 * that adds nothing new, and length-caps the comment. The existence /
 * published / `is_theme` checks against the DB live in the mutation layer
 * (via `validateAndDedupeTagIds`) so this function stays free of DB access.
 *
 * Proposals are additive: an ID already linked to the position is not an
 * error (the proposer may simply not have noticed), it just doesn't count
 * toward "something new". A proposal whose every ID is already linked —
 * including the empty proposal — is a no-op and rejected, since it would
 * only clutter the owner's review queue.
 *
 * @returns A `ValidatedPositionEditRequest` on success, or an error code.
 */
export function validateSubmitPositionEditRequest(
  payload: SubmitPositionEditRequestPayload,
  current: { currentThemeIds: string[]; currentChunkIds: string[] }
): ValidatedPositionEditRequest | PositionEditRequestValidationError {
  const proposedThemeIds = dedupeIds(payload.proposedThemeIds);
  const proposedChunkIds = dedupeIds(payload.proposedChunkIds);
  if (proposedThemeIds === null || proposedChunkIds === null) {
    return 'invalidTagId';
  }

  const currentThemes = new Set(current.currentThemeIds);
  const currentChunks = new Set(current.currentChunkIds);
  const addsSomething =
    proposedThemeIds.some((id) => !currentThemes.has(id)) ||
    proposedChunkIds.some((id) => !currentChunks.has(id));
  if (!addsSomething) {
    return 'nothingToAdd';
  }

  const trimmedComment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
  if (trimmedComment.length > EDIT_REQUEST_COMMENT_MAX_LENGTH) {
    return 'commentTooLong';
  }

  return {
    proposedThemeIds,
    proposedChunkIds,
    comment: trimmedComment.length === 0 ? null : trimmedComment,
  };
}
