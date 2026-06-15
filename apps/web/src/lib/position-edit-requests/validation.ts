import { UUID_RE } from '@/lib/validations/uuid';

/**
 * Lifecycle states for a `position_edit_requests` row. See the schema TSDoc
 * for the full transition diagram. Kept as a const tuple so the validation
 * + UI layers share a single source of truth. Mirrors
 * `CHUNK_EDIT_REQUEST_STATUSES`.
 */
export const POSITION_EDIT_REQUEST_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
] as const;
export type PositionEditRequestStatus = (typeof POSITION_EDIT_REQUEST_STATUSES)[number];

export function isPositionEditRequestStatus(value: unknown): value is PositionEditRequestStatus {
  return (
    typeof value === 'string' &&
    (POSITION_EDIT_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Practical upper bound for the proposer-side `comment` field. The DB
 * column is `text` (unbounded); the cap keeps the UI honest. Matches the
 * chunk edit-request comment cap.
 */
export const POSITION_EDIT_REQUEST_COMMENT_MAX_LENGTH = 2000;

export type SubmitPositionEditRequestPayload = {
  /**
   * The proposed set of linked chunk IDs (absolute snapshot). Order does
   * not matter; duplicates are removed. An empty array is legitimate
   * ("remove all chunk links").
   */
  proposedChunkIds: string[];
  /** Optional rationale from the proposer. Length-capped only. */
  comment?: string | null;
};

export type ValidatedPositionEditRequest = {
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
export type PositionEditRequestValidationError =
  | 'invalidChunkId'
  | 'identicalChunkSet'
  | 'commentTooLong';

/**
 * Compare two chunk-ID sets for order-independent equality.
 */
function sameChunkSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/**
 * Validate a submit-time position edit-request payload against the
 * position's current linked-chunk set. This is the pure / synchronous
 * shape check: it dedupes and UUID-validates the proposed IDs, rejects a
 * no-op proposal (set identical to the current links), and length-caps the
 * comment. The existence / published check against the DB lives in the
 * mutation layer (via `validateAndDedupeTagIds(..., { requirePublishedChunks })`)
 * so this function stays free of DB access.
 *
 * @returns A `ValidatedPositionEditRequest` on success, or an error code.
 */
export function validateSubmitPositionEditRequest(
  payload: SubmitPositionEditRequestPayload,
  current: { currentChunkIds: string[] }
): ValidatedPositionEditRequest | PositionEditRequestValidationError {
  const raw = Array.isArray(payload.proposedChunkIds) ? payload.proposedChunkIds : [];
  const proposedChunkIds = Array.from(new Set(raw));

  for (const id of proposedChunkIds) {
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      return 'invalidChunkId';
    }
  }

  // No-op guard: a proposal identical to the current set would just
  // clutter the owner's review queue.
  if (sameChunkSet(proposedChunkIds, Array.from(new Set(current.currentChunkIds)))) {
    return 'identicalChunkSet';
  }

  const trimmedComment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
  if (trimmedComment.length > POSITION_EDIT_REQUEST_COMMENT_MAX_LENGTH) {
    return 'commentTooLong';
  }

  return {
    proposedChunkIds,
    comment: trimmedComment.length === 0 ? null : trimmedComment,
  };
}
