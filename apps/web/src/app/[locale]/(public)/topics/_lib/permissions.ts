import { and, eq } from 'drizzle-orm';

import { db, userFollows } from '@/lib/db';

/**
 * The post whose `replyPermission` governs a reply — the top-level post of the
 * thread, which every descendant inherits from.
 */
export type PermissionPost = {
  // Null when the post's author was anonymised (account purged → user_id
  // NULL). Such a post has no author to be, and nobody to follow.
  userId: string | null;
  replyPermission: string;
};

/**
 * Enforce the reply-permission gate (`nobody` / `followers`) for a signed-in
 * replier. Returns `{ error }` when the gate blocks the reply, or `null` when
 * it is allowed. The post author is always allowed.
 *
 * This is the single implementation of the rule. The write path (`createReply`)
 * calls it to reject a forbidden reply, and the render path calls it through
 * {@link canUserReply} to decide whether to offer a reply affordance at all, so
 * a thread that shows a reply box is a thread the action will accept.
 */
export async function enforceReplyPermission(
  permissionPost: PermissionPost,
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

/**
 * Whether the viewer may reply to a post — the boolean form of
 * {@link enforceReplyPermission}, for the render path.
 *
 * A signed-out viewer (`userId` undefined) always gets `false`: posting a reply
 * requires an account, whatever the post's setting. That makes `false` mean
 * "this viewer, right now, cannot reply" and nothing more — it does **not**
 * imply the post is restricted, because a guest gets `false` on a wide-open
 * post too. UI that wants to explain a restriction must read the post's
 * `replyPermission` itself rather than infer it from a `false` here; otherwise
 * a signed-out reader of an `everyone` post is told replies are limited.
 */
export async function canUserReply({
  userId,
  postUserId,
  replyPermission,
}: {
  userId: string | undefined;
  postUserId: string | null;
  replyPermission: string;
}): Promise<boolean> {
  if (!userId) return false;

  const error = await enforceReplyPermission({ userId: postUserId, replyPermission }, userId);
  return error === null;
}
