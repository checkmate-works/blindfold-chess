import { and, eq } from 'drizzle-orm';
import 'server-only';

import { db, userFollows } from '@/lib/db';

/**
 * Whether `followerId` follows `followingId` (a row in `user_follows`).
 *
 * Returns false for an anonymous viewer (`null` follower) and for equal ids
 * (you never "follow" yourself — a self-follow can't exist anyway, the table
 * has a CHECK against it). Used to gate follower-only content at the read path.
 */
export async function isFollowing(
  followerId: string | null,
  followingId: string
): Promise<boolean> {
  if (!followerId || followerId === followingId) return false;
  const [row] = await db
    .select({ id: userFollows.id })
    .from(userFollows)
    .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)))
    .limit(1);
  return row != null;
}
