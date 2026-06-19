import { and, eq, isNull } from 'drizzle-orm';

import { db, topicPosts, userFollows } from '@/lib/db';

/** The reply's thread attachment plus the post that governs its permission. */
export type ReplyTarget = {
  parentId: string;
  rootPostId: string;
  // userId is nullable: the governing post's author may have been anonymised
  // (account purged → user_id NULL). Notifications to a null author are skipped.
  permissionPost: { userId: string | null; replyPermission: string };
  notifyUserId: string | null;
};

/**
 * Resolve where a reply attaches in the thread and which post governs its
 * reply permission. Two cases:
 *
 *  - `targetId === postId` — a direct reply to the top-level post. Parent and
 *    root are the post itself; permission is governed by the post.
 *  - otherwise — a reply to another reply. Parent is the target reply, root is
 *    the target's `rootPostId` (falling back to `postId` defensively), and
 *    permission is governed by the root (top-level) post.
 *
 * Returns `{ error: 'postNotFound' }` when a referenced post is missing or
 * soft-deleted.
 */
export async function resolveReplyTarget(
  targetId: string,
  postId: string
): Promise<{ error: string } | ReplyTarget> {
  if (targetId === postId) {
    // Case A: Reply to a top-level post.
    const [topLevelPost] = await db
      .select({
        id: topicPosts.id,
        userId: topicPosts.userId,
        replyPermission: topicPosts.replyPermission,
      })
      .from(topicPosts)
      .where(and(eq(topicPosts.id, postId), isNull(topicPosts.deletedAt)));

    if (!topLevelPost) {
      return { error: 'postNotFound' };
    }

    return {
      parentId: postId,
      rootPostId: postId,
      permissionPost: topLevelPost,
      notifyUserId: topLevelPost.userId,
    };
  }

  // Case B: Reply to another reply.
  const [targetReply] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      rootPostId: topicPosts.rootPostId,
    })
    .from(topicPosts)
    .where(and(eq(topicPosts.id, targetId), isNull(topicPosts.deletedAt)));

  if (!targetReply) {
    return { error: 'postNotFound' };
  }

  // The target reply's rootPostId tells us the top-level post. If rootPostId is
  // null, the target is itself a top-level post (shouldn't happen in this branch
  // since targetId != postId, but handle defensively).
  const rootPostId = targetReply.rootPostId ?? postId;

  // Permission check uses the root (top-level) post.
  const [rootPost] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      replyPermission: topicPosts.replyPermission,
    })
    .from(topicPosts)
    .where(and(eq(topicPosts.id, rootPostId), isNull(topicPosts.deletedAt)));

  if (!rootPost) {
    return { error: 'postNotFound' };
  }

  return {
    parentId: targetId,
    rootPostId,
    permissionPost: rootPost,
    notifyUserId: targetReply.userId,
  };
}

/**
 * Enforce the reply-permission gate (`nobody` / `followers`) for a non-author
 * replier. Returns `{ error }` when the gate blocks the reply, or `null` when
 * it is allowed. The post author is always allowed.
 */
export async function enforceReplyPermission(
  permissionPost: { userId: string | null; replyPermission: string },
  userId: string
): Promise<{ error: string } | null> {
  if (permissionPost.userId === userId) {
    return null;
  }

  if (permissionPost.replyPermission === 'nobody') {
    return { error: 'repliesDisabled' };
  }

  if (permissionPost.replyPermission === 'followers') {
    // An anonymised (purged) author can't be followed, so the gate can never
    // be satisfied — and there is no id to match against.
    if (!permissionPost.userId) {
      return { error: 'followRequired' };
    }
    const [follow] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(
        and(eq(userFollows.followerId, userId), eq(userFollows.followingId, permissionPost.userId))
      );

    if (!follow) {
      return { error: 'followRequired' };
    }
  }

  return null;
}
