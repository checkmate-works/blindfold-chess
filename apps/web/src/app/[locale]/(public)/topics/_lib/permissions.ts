import { and, eq } from 'drizzle-orm';

import { db, userFollows } from '@/lib/db';

/**
 * Check whether a user can reply to a post based on its replyPermission setting.
 *
 * Returns `true` when the user is the post author, when permission is 'everyone',
 * or when permission is 'followers' and the user follows the author.
 * Returns `false` when permission is 'nobody' (and user is not the author),
 * or when permission is 'followers' and the user does not follow the author.
 */
export async function canUserReply({
  userId,
  postUserId,
  replyPermission,
}: {
  userId: string | undefined;
  // Null when the post's author was anonymised (account purged). Such a post
  // has no author to be, or to follow.
  postUserId: string | null;
  replyPermission: string;
}): Promise<boolean> {
  const isAuthor = userId === postUserId;
  if (isAuthor) return true;

  if (replyPermission === 'nobody') return false;

  if (replyPermission === 'followers' && userId) {
    // An anonymised author can't be followed, so the gate can never be met.
    if (!postUserId) return false;
    const [follow] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(and(eq(userFollows.followerId, userId), eq(userFollows.followingId, postUserId)));

    return !!follow;
  }

  return true;
}
