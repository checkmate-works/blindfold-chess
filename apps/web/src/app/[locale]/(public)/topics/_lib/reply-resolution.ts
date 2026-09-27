import { and, eq, isNull } from 'drizzle-orm';

import { db, topicPosts } from '@/lib/db';

import type { PermissionPost } from './permissions';

/** The reply's thread attachment plus the post that governs its permission. */
export type ReplyTarget = {
  parentId: string;
  rootPostId: string;
  permissionPost: PermissionPost;
  // Null when the replied-to post's author was anonymised (account purged →
  // user_id NULL). Notifications to a null author are skipped.
  notifyUserId: string | null;
};

/** A live (not soft-deleted) post as the reply resolution reads it. */
export type ReplyResolutionPost = PermissionPost & {
  id: string;
  rootPostId: string | null;
};

/**
 * Decide where a reply attaches in the thread and which post governs its
 * reply permission, from the already-fetched posts. Two cases:
 *
 *  - `targetId === postId` — a direct reply to the top-level post. Parent and
 *    root are the post itself; permission is governed by the post.
 *  - otherwise — a reply to another reply. Parent is the target reply, root is
 *    the post `rootPostIdOf(target)` names, and permission is governed by
 *    that root (top-level) post.
 *
 * `target` / `root` are `undefined` when the post is missing or soft-deleted,
 * which yields `{ error: 'postNotFound' }`.
 */
export function decideReplyTarget(
  targetId: string,
  postId: string,
  target: ReplyResolutionPost | undefined,
  root: ReplyResolutionPost | undefined
): { error: string } | ReplyTarget {
  if (!target || !root) {
    return { error: 'postNotFound' };
  }
  const permissionPost = { userId: root.userId, replyPermission: root.replyPermission };
  if (targetId === postId) {
    return { parentId: postId, rootPostId: postId, permissionPost, notifyUserId: root.userId };
  }
  return { parentId: targetId, rootPostId: root.id, permissionPost, notifyUserId: target.userId };
}

/**
 * The top-level post a reply to `target` belongs to. A null `rootPostId`
 * means the target is itself a top-level post — which shouldn't happen when
 * `targetId !== postId`, but falls back to `postId` defensively.
 */
export function rootPostIdOf(target: ReplyResolutionPost, postId: string): string {
  return target.rootPostId ?? postId;
}

async function findLivePost(id: string): Promise<ReplyResolutionPost | undefined> {
  const [post] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      rootPostId: topicPosts.rootPostId,
      replyPermission: topicPosts.replyPermission,
    })
    .from(topicPosts)
    .where(and(eq(topicPosts.id, id), isNull(topicPosts.deletedAt)));
  return post;
}

/**
 * Fetch the posts {@link decideReplyTarget} needs and resolve the reply's
 * target. The root is only looked up once the target is known to exist, and
 * is the target itself for a direct reply to the top-level post.
 */
export async function resolveReplyTarget(
  targetId: string,
  postId: string
): Promise<{ error: string } | ReplyTarget> {
  const target = await findLivePost(targetId);
  const root =
    !target || targetId === postId ? target : await findLivePost(rootPostIdOf(target, postId));
  return decideReplyTarget(targetId, postId, target, root);
}
