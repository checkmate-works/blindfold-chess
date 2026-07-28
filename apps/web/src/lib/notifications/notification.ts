import type { SQL } from 'drizzle-orm';
import { and, eq, gte, inArray } from 'drizzle-orm';
import 'server-only';

import { db, notifications, userFollows } from '../db';
import { isBlockedBetween } from '../moderation/block';
import { isMutableNotificationType } from './mutable-types';
import { isNotificationTypeMuted } from './mutes';
import { resolveSupersedeRule } from './supersede';

type NotificationEvent = {
  /**
   * Recipient. `null` / `undefined` when the would-be recipient was anonymised
   * (account purged → `user_id` NULL): {@link createNotification} no-ops in that
   * case, so callers do not need to null-check the recipient themselves.
   */
  userId: string | null | undefined;
  actorId?: string;
  type: string;
  targetType?: string;
  targetId?: string;
  groupKey?: string;
  metadata?: Record<string, unknown>;
};

/** Deduplication window in milliseconds (5 minutes). */
const DEDUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * Create a notification. Fire-and-forget — failures are silently
 * caught so that notification creation never breaks the main action.
 *
 * Includes deduplication: if a notification with the same userId + type +
 * actorId + targetType + targetId already exists within the time window,
 * the insert is skipped.
 *
 * On top of that exact-type dedup, types listed in `supersede.ts` collapse
 * against each other within one (recipient, actor, target) group, so that a
 * single action that emits both a follower fan-out and a direct notification
 * leaves the recipient with only the more specific of the two. See that
 * module for which types collide and why the collapse is opt-in per type.
 */
export function createNotification(event: NotificationEvent): void {
  // A notification must have a recipient. When the recipient was anonymised
  // (account purged → user_id NULL) there is nobody to notify, so no-op.
  // Centralising the guard here means callers never repeat it.
  const { userId } = event;
  if (!userId) return;

  (async () => {
    // Suppress every actor→recipient notification once either side has blocked
    // the other. This is the single DRY choke point — follow, like, comment,
    // reply, fork and fan-out events all funnel through here.
    if (event.actorId && (await isBlockedBetween(userId, event.actorId))) {
      return;
    }

    // Recipient opted out of this notification type. Only mutable types are
    // checked — this also keeps the extra query off every notification the
    // recipient can't mute in the first place.
    if (
      isMutableNotificationType(event.type) &&
      (await isNotificationTypeMuted(userId, event.type))
    ) {
      return;
    }

    // Deduplication check
    const since = new Date(Date.now() - DEDUP_WINDOW_MS);

    // A supersede rule only applies to a fully-identified group: without an
    // actor or a target there is nothing to collapse against, so those events
    // keep the plain exact-type dedup below.
    const { actorId, targetType, targetId } = event;
    const supersede =
      actorId && targetType && targetId
        ? buildSupersedeContext({ type: event.type, userId, actorId, targetType, targetId, since })
        : null;

    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        supersede
          ? // Any equal-or-more-specific row already covers this event —
            // including one of the same type, so this subsumes the exact-type
            // dedup for these types rather than skipping it.
            and(supersede.groupFilter, inArray(notifications.type, supersede.dominatingTypes))
          : and(
              eq(notifications.userId, userId),
              eq(notifications.type, event.type),
              ...(actorId ? [eq(notifications.actorId, actorId)] : []),
              ...(targetType ? [eq(notifications.targetType, targetType)] : []),
              ...(targetId ? [eq(notifications.targetId, targetId)] : []),
              gte(notifications.createdAt, since)
            )
      )
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    await db.insert(notifications).values({
      userId,
      actorId: actorId ?? null,
      type: event.type,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      groupKey: event.groupKey ?? null,
      metadata: event.metadata ?? {},
    });

    if (!supersede) return;

    // Reconcile the group AFTER the insert. The colliding emitters run
    // concurrently as fire-and-forget promises with several awaited
    // roundtrips each, so the pre-insert check above can read the group
    // before the other row lands and still insert after it. Both directions
    // are therefore settled here, against the DB rather than against the
    // rows the check returned — whichever emitter writes last cleans up, so
    // the end state does not depend on who wins the race.
    if (supersede.dominatedTypes.length > 0) {
      // Rows this notification makes redundant.
      await db
        .delete(notifications)
        .where(and(supersede.groupFilter, inArray(notifications.type, supersede.dominatedTypes)));
    }

    if (supersede.strictlyDominatingTypes.length > 0) {
      // ...and the mirror image: a more specific row appeared while this one
      // was being written, so this type is now the redundant one. Deleting by
      // type rather than by inserted id also sweeps up a same-type row a
      // second racing writer may have added.
      const moreSpecific = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(supersede.groupFilter, inArray(notifications.type, supersede.strictlyDominatingTypes))
        )
        .limit(1);

      if (moreSpecific.length > 0) {
        await db
          .delete(notifications)
          .where(and(supersede.groupFilter, eq(notifications.type, event.type)));
      }
    }
  })().catch(() => {});
}

/**
 * Resolve the supersede rule for an event that has a full
 * (recipient, actor, target) identity, and pair it with the SQL filter that
 * selects that group inside the dedup window. Returns `null` when the type
 * belongs to no collision class — the caller then falls back to exact-type
 * dedup. Split out of {@link createNotification} so the narrowed,
 * definitely-present actor/target values stay narrowed.
 */
function buildSupersedeContext(params: {
  type: string;
  userId: string;
  actorId: string;
  targetType: string;
  targetId: string;
  since: Date;
}): {
  groupFilter: SQL | undefined;
  dominatingTypes: string[];
  strictlyDominatingTypes: string[];
  dominatedTypes: string[];
} | null {
  const rule = resolveSupersedeRule(params.type);
  if (!rule) return null;

  return {
    groupFilter: and(
      eq(notifications.userId, params.userId),
      eq(notifications.actorId, params.actorId),
      eq(notifications.targetType, params.targetType),
      eq(notifications.targetId, params.targetId),
      gte(notifications.createdAt, params.since)
    ),
    dominatingTypes: [...rule.dominatingTypes],
    strictlyDominatingTypes: [...rule.strictlyDominatingTypes],
    dominatedTypes: [...rule.dominatedTypes],
  };
}

/**
 * Shared follower fan-out: load the actor's followers and emit one
 * notification per follower via {@link createNotification}. The
 * `notifyFollowersOf*` entry points differ only in the per-follower event
 * they build and how a fan-out failure is surfaced.
 *
 * Each createNotification triggers up to 2 DB queries (dedup SELECT + INSERT),
 * plus one more for the fan-out types that take part in a supersede class
 * (`new_post`, `new_position` — see `supersede.ts`), whose post-insert
 * re-check runs per follower even though at most one of them can be the
 * recipient of the colliding direct notification. At current scale this is
 * acceptable, but for large follower counts consider batching inserts instead
 * of looping.
 */
function broadcastToFollowers(
  actorId: string,
  buildEvent: (followerId: string) => NotificationEvent,
  onError: (error: unknown) => void = () => {}
): void {
  (async () => {
    const followers = await db
      .select({ followerId: userFollows.followerId })
      .from(userFollows)
      .where(eq(userFollows.followingId, actorId));

    for (const follower of followers) {
      createNotification(buildEvent(follower.followerId));
    }
  })().catch(onError);
}

/**
 * Notify all followers of a user about a new post.
 * Fire-and-forget — failures are silently caught.
 */
export function notifyFollowersOfNewPost(params: {
  actorId: string;
  postId: string;
  topicType: string;
  topicKey: string;
}): void {
  broadcastToFollowers(params.actorId, (followerId) => ({
    userId: followerId,
    actorId: params.actorId,
    type: 'new_post',
    targetType: 'topic_post',
    targetId: params.postId,
    metadata: {
      topicType: params.topicType,
      topicKey: params.topicKey,
      postId: params.postId,
    },
  }));
}

/**
 * Notify all followers of a user about a new position (memory or puzzle).
 * Fire-and-forget — failures are logged but do not block the caller.
 */
export function notifyFollowersOfNewPosition(params: {
  actorId: string;
  positionId: string;
  positionType: 'memory' | 'puzzle';
}): void {
  broadcastToFollowers(
    params.actorId,
    (followerId) => ({
      userId: followerId,
      actorId: params.actorId,
      type: 'new_position',
      targetType: 'position',
      targetId: params.positionId,
      metadata: {
        positionType: params.positionType,
        positionId: params.positionId,
      },
    }),
    (error) => {
      console.error('[notifyFollowersOfNewPosition] failed:', error);
    }
  );
}

/**
 * Notify a position's owner that another user forked it into a new entry —
 * `outputType: 'puzzle'` covers a same-type puzzle fork (`sourceType:
 * 'puzzle'`) as well as the cross-type "Create Puzzle" action from a
 * position-memory entry (`sourceType: 'memory'`); `outputType: 'memory'`
 * covers a same-type position-memory fork. The notification `type` is
 * derived from `outputType` (`puzzle_forked` / `memory_forked`) rather than
 * a single shared type, so the two remain distinguishable in the
 * notifications list and each keeps its own message wording. Direct 1:1
 * notification to the source's owner, not a follower broadcast (unlike
 * `notifyFollowersOfNewPosition` above). Self-forks are the caller's
 * responsibility to filter out — mirrors the `like` notification's
 * self-like guard in `performEntityToggleLike`; this function does not
 * re-check ownership.
 */
export function notifyPositionForked(params: {
  actorId: string;
  ownerId: string;
  newPositionId: string;
  outputType: 'memory' | 'puzzle';
  sourceType: 'memory' | 'puzzle';
}): void {
  createNotification({
    userId: params.ownerId,
    actorId: params.actorId,
    type: params.outputType === 'puzzle' ? 'puzzle_forked' : 'memory_forked',
    targetType: 'position',
    targetId: params.newPositionId,
    metadata: {
      positionId: params.newPositionId,
      positionType: params.outputType,
      sourceType: params.sourceType,
    },
  });
}

/**
 * Notify all followers of a user about a new chunk lifecycle event.
 * `kind` distinguishes the two surface points: `'created'` for a draft
 * submission (calls for edit-request review) and `'published'` for the
 * promotion to canonical. A draft that is later published thus emits
 * two notifications — same chunk, different framing — mirroring the
 * two feed_items rows the same lifecycle produces.
 *
 * Fire-and-forget — failures are logged but do not block the caller.
 */
export function notifyFollowersOfNewChunk(params: {
  actorId: string;
  chunkId: string;
  slug: string;
  kind: 'created' | 'published';
}): void {
  const notificationType = params.kind === 'published' ? 'chunk_published' : 'new_chunk_draft';

  broadcastToFollowers(
    params.actorId,
    (followerId) => ({
      userId: followerId,
      actorId: params.actorId,
      type: notificationType,
      targetType: 'chunk',
      targetId: params.chunkId,
      metadata: {
        chunkId: params.chunkId,
        slug: params.slug,
        kind: params.kind,
      },
    }),
    (error) => {
      console.error('[notifyFollowersOfNewChunk] failed:', error);
    }
  );
}

/**
 * Notify all followers of a user about a newly published blindfold game.
 * Only registered authors reach this path (account-less games have no actor /
 * followers). Fire-and-forget — failures are logged but do not block publish.
 */
export function notifyFollowersOfNewGame(params: { actorId: string; gameId: string }): void {
  broadcastToFollowers(
    params.actorId,
    (followerId) => ({
      userId: followerId,
      actorId: params.actorId,
      type: 'new_game',
      targetType: 'game',
      targetId: params.gameId,
      metadata: { gameId: params.gameId },
    }),
    (error) => {
      console.error('[notifyFollowersOfNewGame] failed:', error);
    }
  );
}

/**
 * Notify the author of a topic about a new comment.
 * Fire-and-forget — failures are silently caught.
 */
export function notifyTopicAuthorOfNewComment(params: {
  authorId: string;
  actorId: string;
  postId: string;
  topicType: string;
  topicKey: string;
}): void {
  if (params.authorId === params.actorId) return;

  createNotification({
    userId: params.authorId,
    actorId: params.actorId,
    type: 'new_comment_on_topic',
    targetType: 'topic_post',
    targetId: params.postId,
    metadata: {
      topicType: params.topicType,
      topicKey: params.topicKey,
      postId: params.postId,
    },
  });
}
