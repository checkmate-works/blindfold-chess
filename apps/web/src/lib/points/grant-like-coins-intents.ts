import { LIKE_GRANT_FORK_KEY_PREFIX, LIKE_GRANT_KEY_PREFIX } from './constants';

/**
 * Pure intent-derivation for the daily like-coin batch.
 *
 * Kept free of `server-only`, DB imports, and clock access so the
 * fork-propagation business rules — the subtle part of the feature — can be
 * exercised by a plain unit test. The orchestrator (`grant-like-coins.ts`)
 * is responsible for fetching the rows that become the inputs here.
 */

/** Whether a grant is the direct payout or the one-level fork propagation. */
export type GrantVia = 'direct' | 'fork';

/**
 * A single coin payout the batch intends to write. One `point_events` row
 * per intent. `idempotencyKey` is the hard guard against double-payment.
 */
export type GrantIntent = {
  /** User who receives the coin. */
  recipientId: string;
  /** `point_events.idempotency_key` — UNIQUE, absorbs reruns and relikes. */
  idempotencyKey: string;
  /** The liked content's polymorphic type (`position` | `topic_post`). */
  targetType: string;
  /** The liked content's id. */
  targetId: string;
  /** User who performed the like. */
  likerId: string;
  via: GrantVia;
};

/** A `likes` row narrowed to the fields the batch needs. */
export type LikeRow = {
  likerId: string;
  targetType: string;
  targetId: string;
};

/** Owner + soft-delete state of a liked piece of content. */
export type ContentRow = {
  ownerId: string;
  deletedAt: Date | null;
};

/** A `positions` row — content that additionally carries fork lineage. */
export type PositionRow = ContentRow & {
  forkedFromId: string | null;
};

/** Idempotency key for the direct grant to a liked content's owner. */
export function directGrantKey(targetType: string, targetId: string, likerId: string): string {
  return `${LIKE_GRANT_KEY_PREFIX}:${targetType}:${targetId}:${likerId}`;
}

/** Idempotency key for the fork-propagation grant to a fork parent's owner. */
export function forkGrantKey(targetType: string, targetId: string, likerId: string): string {
  return `${LIKE_GRANT_FORK_KEY_PREFIX}:${targetType}:${targetId}:${likerId}`;
}

/**
 * Turn a window of `likes` rows into the coin payouts they earn.
 *
 * Rules (see issue #87):
 * - Each like grants **1 coin to the liked content's owner** — self-likes
 *   included (capped externally by how much content one person owns).
 * - A like on a forked `position` *also* grants 1 coin to the fork
 *   **parent's** owner — but only one level up, and only when the parent
 *   still exists and is not soft-deleted.
 * - Soft-deleted / missing liked content yields no intent at all.
 *
 * The fork grant is withheld in two cases — each a self-farm hole:
 * - **Fork parent owner == fork owner.** A user forking their own problem
 *   would otherwise collect 2 coins from a single like.
 * - **Fork parent owner == liker.** Otherwise an author could mint coins by
 *   liking forks of their own work; unlike a direct self-like (bounded by
 *   the author's own content count), this farm is amplified by the number
 *   of forks *other people* create, so it is unbounded and must be cut.
 */
export function buildGrantIntents(input: {
  likeRows: readonly LikeRow[];
  positionById: ReadonlyMap<string, PositionRow>;
  topicPostById: ReadonlyMap<string, ContentRow>;
  forkParentById: ReadonlyMap<string, ContentRow>;
}): GrantIntent[] {
  const { likeRows, positionById, topicPostById, forkParentById } = input;
  const intents: GrantIntent[] = [];

  for (const like of likeRows) {
    const content =
      like.targetType === 'position'
        ? positionById.get(like.targetId)
        : like.targetType === 'topic_post'
          ? topicPostById.get(like.targetId)
          : undefined;

    // Missing (orphaned like) or soft-deleted at batch time — skip entirely.
    if (!content || content.deletedAt !== null) continue;

    // Direct grant to the liked content's owner (self-likes allowed).
    intents.push({
      recipientId: content.ownerId,
      idempotencyKey: directGrantKey(like.targetType, like.targetId, like.likerId),
      targetType: like.targetType,
      targetId: like.targetId,
      likerId: like.likerId,
      via: 'direct',
    });

    // Fork propagation — positions only, one level up.
    if (like.targetType !== 'position') continue;
    const position = content as PositionRow;
    if (position.forkedFromId === null) continue;

    const parent = forkParentById.get(position.forkedFromId);
    if (!parent || parent.deletedAt !== null) continue;
    if (parent.ownerId === position.ownerId) continue; // self-fork
    if (parent.ownerId === like.likerId) continue; // author farming own forks

    intents.push({
      recipientId: parent.ownerId,
      idempotencyKey: forkGrantKey(like.targetType, like.targetId, like.likerId),
      targetType: like.targetType,
      targetId: like.targetId,
      likerId: like.likerId,
      via: 'fork',
    });
  }

  return intents;
}
