import { and, eq, gte } from 'drizzle-orm';
import 'server-only';

import { db, notifications, userFollows } from '../db';

type NotificationEvent = {
  userId: string;
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
 */
export function createNotification(event: NotificationEvent): void {
  (async () => {
    // Deduplication check
    const since = new Date(Date.now() - DEDUP_WINDOW_MS);
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, event.userId),
          eq(notifications.type, event.type),
          ...(event.actorId ? [eq(notifications.actorId, event.actorId)] : []),
          ...(event.targetType ? [eq(notifications.targetType, event.targetType)] : []),
          ...(event.targetId ? [eq(notifications.targetId, event.targetId)] : []),
          gte(notifications.createdAt, since)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    await db.insert(notifications).values({
      userId: event.userId,
      actorId: event.actorId ?? null,
      type: event.type,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      groupKey: event.groupKey ?? null,
      metadata: event.metadata ?? {},
    });
  })().catch(() => {});
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
  (async () => {
    const followers = await db
      .select({ followerId: userFollows.followerId })
      .from(userFollows)
      .where(eq(userFollows.followingId, params.actorId));

    // Each createNotification triggers up to 2 DB queries (dedup SELECT + INSERT).
    // At current scale this is acceptable, but for large follower counts consider
    // batching inserts instead of looping.
    for (const follower of followers) {
      createNotification({
        userId: follower.followerId,
        actorId: params.actorId,
        type: 'new_post',
        targetType: 'topic_post',
        targetId: params.postId,
        metadata: {
          topicType: params.topicType,
          topicKey: params.topicKey,
          postId: params.postId,
        },
      });
    }
  })().catch(() => {});
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
  (async () => {
    const followers = await db
      .select({ followerId: userFollows.followerId })
      .from(userFollows)
      .where(eq(userFollows.followingId, params.actorId));

    for (const follower of followers) {
      createNotification({
        userId: follower.followerId,
        actorId: params.actorId,
        type: 'new_position',
        targetType: 'position',
        targetId: params.positionId,
        metadata: {
          positionType: params.positionType,
          positionId: params.positionId,
        },
      });
    }
  })().catch((error) => {
    console.error('[notifyFollowersOfNewPosition] failed:', error);
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
  (async () => {
    const followers = await db
      .select({ followerId: userFollows.followerId })
      .from(userFollows)
      .where(eq(userFollows.followingId, params.actorId));

    const notificationType = params.kind === 'published' ? 'chunk_published' : 'new_chunk_draft';

    for (const follower of followers) {
      createNotification({
        userId: follower.followerId,
        actorId: params.actorId,
        type: notificationType,
        targetType: 'chunk',
        targetId: params.chunkId,
        metadata: {
          chunkId: params.chunkId,
          slug: params.slug,
          kind: params.kind,
        },
      });
    }
  })().catch((error) => {
    console.error('[notifyFollowersOfNewChunk] failed:', error);
  });
}

/**
 * Notify all followers of a user about a newly published blindfold game.
 * Only registered authors reach this path (account-less games have no actor /
 * followers). Fire-and-forget — failures are logged but do not block publish.
 */
export function notifyFollowersOfNewGame(params: { actorId: string; gameId: string }): void {
  (async () => {
    const followers = await db
      .select({ followerId: userFollows.followerId })
      .from(userFollows)
      .where(eq(userFollows.followingId, params.actorId));

    for (const follower of followers) {
      createNotification({
        userId: follower.followerId,
        actorId: params.actorId,
        type: 'new_game',
        targetType: 'game',
        targetId: params.gameId,
        metadata: { gameId: params.gameId },
      });
    }
  })().catch((error) => {
    console.error('[notifyFollowersOfNewGame] failed:', error);
  });
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
