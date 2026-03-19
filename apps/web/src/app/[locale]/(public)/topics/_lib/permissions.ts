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
  postUserId: string;
  replyPermission: string;
}): Promise<boolean> {
  const isAuthor = userId === postUserId;
  if (isAuthor) return true;

  if (replyPermission === 'nobody') return false;

  if (replyPermission === 'followers' && userId) {
    const [follow] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(and(eq(userFollows.followerId, userId), eq(userFollows.followingId, postUserId)));

    return !!follow;
  }

  return true;
}
