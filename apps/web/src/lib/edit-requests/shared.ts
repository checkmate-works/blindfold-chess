/**
 * Primitives shared by the chunk and position edit-request state machines
 * (`@/lib/chunk-edit-requests/mutations`, `@/lib/position-edit-requests/mutations`).
 *
 * Only the genuinely identical pieces live here. The submit / resolve bodies
 * themselves are deliberately NOT unified: they share the same orchestration
 * shape but almost every step differs — different tables, the chunk variant
 * gates accept/reject on `draft` status while positions have no lifecycle,
 * the position variant snapshots the linked-chunk set inside the resolve
 * transaction, and the apply functions, notification payloads and
 * revalidation targets are all entity-specific. A generic resolver
 * parameterised by ~10 callbacks would bury those invariants behind
 * indirection for no real gain.
 */

/**
 * Lifecycle states for an edit-request row (chunk and position variants
 * share the same state machine). See the schema TSDoc for the transition
 * diagram. Kept as a const tuple so the validation + UI layers share a
 * single source of truth.
 */
export const EDIT_REQUEST_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;
export type EditRequestStatus = (typeof EDIT_REQUEST_STATUSES)[number];

export function isEditRequestStatus(value: unknown): value is EditRequestStatus {
  return typeof value === 'string' && (EDIT_REQUEST_STATUSES as readonly string[]).includes(value);
}

/**
 * Practical upper bound for the proposer-side `comment` field. The DB
 * column is `text` (unbounded); the cap keeps the UI honest. 2,000 chars
 * covers a full paragraph or two of rationale without enabling
 * spam-length blobs.
 */
export const EDIT_REQUEST_COMMENT_MAX_LENGTH = 2000;

export type EditRequestAction = 'accept' | 'reject' | 'withdraw';

export type EditRequestTerminalStatus = Exclude<EditRequestStatus, 'pending'>;

/** Maps a resolve action to the terminal status written to the request row. */
export const EDIT_REQUEST_TERMINAL_STATUS: Record<EditRequestAction, EditRequestTerminalStatus> = {
  accept: 'accepted',
  reject: 'rejected',
  withdraw: 'withdrawn',
};
