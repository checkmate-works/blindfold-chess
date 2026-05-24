import { CHUNK_TITLE_MAX_LENGTH } from '@/lib/chunks/validation';

/**
 * Lifecycle states for a `chunk_edit_requests` row. See the schema TSDoc
 * for the full transition diagram. Kept as a const tuple so the validation
 * + UI layers share a single source of truth.
 */
export const CHUNK_EDIT_REQUEST_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
] as const;
export type ChunkEditRequestStatus = (typeof CHUNK_EDIT_REQUEST_STATUSES)[number];

export function isChunkEditRequestStatus(value: unknown): value is ChunkEditRequestStatus {
  return (
    typeof value === 'string' && (CHUNK_EDIT_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Practical upper bound for the proposer-side `comment` field on a
 * request. The DB column is `text` (unbounded); the cap below keeps
 * the UI honest. 2,000 chars covers a full paragraph or two of
 * rationale without enabling spam-length blobs.
 */
export const CHUNK_EDIT_REQUEST_COMMENT_MAX_LENGTH = 2000;

/**
 * Description length cap reused from the chunk validation rules so a
 * proposed value stays compatible with the column the accept path
 * eventually writes. Kept inline rather than re-imported from the
 * chunks module to avoid creating a circular dependency in either
 * direction.
 */
export const CHUNK_EDIT_REQUEST_DESCRIPTION_MAX_LENGTH = 5000;

type CurrentChunkSnapshot = {
  title: string;
  description: string | null;
};

export type SubmitEditRequestPayload = {
  /**
   * Proposed new title. Optional when the request is description-only.
   * When present, must be non-empty after trimming and fit within
   * `CHUNK_TITLE_MAX_LENGTH`. The validator also rejects a value that
   * is identical to the chunk's current title (no-op suggestion).
   */
  proposedTitle?: string | null;
  /**
   * Proposed new description. Optional when the request is title-only.
   * Empty / whitespace-only strings are normalized to `null` and
   * compared against the chunk's current description.
   */
  proposedDescription?: string | null;
  /** Optional rationale from the proposer. Length-capped only. */
  comment?: string | null;
};

/**
 * Normalize a free-form description input to the "stored shape":
 * trimmed string when non-empty, `null` when empty / whitespace-only.
 * The accept path uses the same coercion when writing to `chunks.description`.
 */
function normalizeDescription(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export type ValidatedEditRequest = {
  /** Trimmed title when proposed; absent when the request targets only the description. */
  proposedTitle: string | null;
  /** Normalized description when proposed; absent when the request targets only the title. */
  proposedDescription: string | null;
  /**
   * Coerced shape used by the persistence layer. `null` means
   * "do not write this column to the request row" — keeps the
   * shape stable regardless of whether the proposer supplied a
   * fully-blank description or omitted the field altogether.
   */
  hasTitleProposal: boolean;
  hasDescriptionProposal: boolean;
  comment: string | null;
};

/**
 * Validate a submit-time edit-request payload against the chunk's
 * current values. The "at least one field must differ" rule is what
 * keeps the UI honest — a no-op suggestion would just clutter the
 * owner's review queue.
 *
 * @returns A `ValidatedEditRequest` on success, or an error message
 *   string when the payload is invalid. The shape mirrors the
 *   `validateChunkMutationData` contract for consistency.
 */
export function validateSubmitEditRequest(
  payload: SubmitEditRequestPayload,
  current: CurrentChunkSnapshot
): ValidatedEditRequest | string {
  const trimmedTitle =
    typeof payload.proposedTitle === 'string' ? payload.proposedTitle.trim() : '';
  const titleSupplied = typeof payload.proposedTitle === 'string' && trimmedTitle.length > 0;

  if (titleSupplied) {
    if (trimmedTitle.length > CHUNK_TITLE_MAX_LENGTH) {
      return `Proposed title must be ${CHUNK_TITLE_MAX_LENGTH} characters or fewer`;
    }
    if (trimmedTitle === current.title.trim()) {
      return 'Proposed title is identical to the current title';
    }
  }

  const descriptionSupplied =
    typeof payload.proposedDescription === 'string' && payload.proposedDescription.length > 0;
  const normalizedDescription = normalizeDescription(payload.proposedDescription);

  if (descriptionSupplied) {
    if (
      normalizedDescription !== null &&
      normalizedDescription.length > CHUNK_EDIT_REQUEST_DESCRIPTION_MAX_LENGTH
    ) {
      return `Proposed description must be ${CHUNK_EDIT_REQUEST_DESCRIPTION_MAX_LENGTH} characters or fewer`;
    }
    const currentNormalized = normalizeDescription(current.description);
    if (normalizedDescription === currentNormalized) {
      return 'Proposed description is identical to the current description';
    }
  }

  if (!titleSupplied && !descriptionSupplied) {
    return 'At least one of title or description must be proposed';
  }

  const trimmedComment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
  if (trimmedComment.length > CHUNK_EDIT_REQUEST_COMMENT_MAX_LENGTH) {
    return `Comment must be ${CHUNK_EDIT_REQUEST_COMMENT_MAX_LENGTH} characters or fewer`;
  }

  return {
    proposedTitle: titleSupplied ? trimmedTitle : null,
    proposedDescription: descriptionSupplied ? normalizedDescription : null,
    hasTitleProposal: titleSupplied,
    hasDescriptionProposal: descriptionSupplied,
    comment: trimmedComment.length === 0 ? null : trimmedComment,
  };
}
