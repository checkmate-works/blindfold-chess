/**
 * Domain events emitted when a `chunks` row transitions through its
 * lifecycle. Each event captures the *minimal* identity + metadata an
 * after-the-fact side effect (timeline notifications, audit logging,
 * Next.js cache revalidation) needs — the side effects themselves live in
 * `./chunk-event-handlers.ts`.
 *
 * Why these events exist:
 *
 *  - The four user-facing mutations (`createChunkEntry`,
 *    `updateChunkEntry`, `publishChunkEntry`, `deleteChunkEntry`) all
 *    fan out into roughly the same set of side effects with subtle
 *    per-transition differences. Inlining the fan-out at each call
 *    site mixes mutation logic with notification / log / cache logic at
 *    the same indent level; it made "what fires when X happens?" a
 *    grep-across-files question instead of a read-the-handler answer.
 *
 *  - Future side effects (webhook dispatch, search-index updates) only
 *    have to extend the handler — no new branch has to be threaded
 *    through every mutation function.
 *
 * Events are dispatched *after* the transaction commits. They are not
 * the source of truth — the DB write is. Failure of an event handler
 * does not roll back the mutation; handlers are written to be
 * fire-and-forget where possible.
 */
export type ChunkCreatedEvent = {
  kind: 'created';
  actorId: string;
  chunkId: string;
  slug: string;
  /** Whether this row was published on creation or saved as a draft. */
  initialStatus: 'draft' | 'published';
};

export type ChunkUpdatedEvent = {
  kind: 'updated';
  actorId: string;
  chunkId: string;
  /** The slug after the update — may differ from `previousSlug` on rename. */
  slug: string;
  /** Filled only when the slug changed in this mutation. */
  previousSlug?: string;
};

export type ChunkPublishedEvent = {
  kind: 'published';
  actorId: string;
  chunkId: string;
  slug: string;
  /**
   * The status the chunk was promoted from. Always `'draft'` in the
   * current code path (re-publish is short-circuited before the event
   * fires) but kept explicit for the audit log.
   */
  from: string;
};

export type ChunkDeletedEvent = {
  kind: 'deleted';
  actorId: string;
  chunkId: string;
  slug: string;
  title: string;
};

export type ChunkEvent =
  | ChunkCreatedEvent
  | ChunkUpdatedEvent
  | ChunkPublishedEvent
  | ChunkDeletedEvent;
