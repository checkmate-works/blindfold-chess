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

export type EditRequestAction = 'accept' | 'reject' | 'withdraw';

export type EditRequestTerminalStatus = 'accepted' | 'rejected' | 'withdrawn';

/** Maps a resolve action to the terminal status written to the request row. */
export const EDIT_REQUEST_TERMINAL_STATUS: Record<EditRequestAction, EditRequestTerminalStatus> = {
  accept: 'accepted',
  reject: 'rejected',
  withdraw: 'withdrawn',
};
