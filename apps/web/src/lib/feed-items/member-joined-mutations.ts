import { and, eq, isNull } from 'drizzle-orm';
import 'server-only';

import { db, feedItems, likes, profiles } from '@/lib/db';

import { MEMBER_JOINED_ENTITY_TYPE, MEMBER_JOINED_LIKE_TARGET } from './member-joined';

/**
 * Record the member's answer to the onboarding arrival-announcement step and,
 * when the answer is yes, post the card.
 *
 * The conditional UPDATE is the claim: only the request that flips
 * `join_announcement_decided_at` from NULL inserts a row, so a double submit,
 * a second tab, or a return visit after deleting the card cannot post again.
 * It also returns nothing for a member who has no `profiles` row yet, or who
 * predates the feature (backfilled as decided), so both fall out as
 * `alreadyDecided` without a separate check.
 *
 * @returns `true` if this call recorded the answer, `false` if it was already
 *   recorded (nothing changed).
 */
export async function decideJoinAnnouncement(userId: string, announce: boolean): Promise<boolean> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .update(profiles)
      .set({ joinAnnouncementDecidedAt: new Date() })
      .where(and(eq(profiles.id, userId), isNull(profiles.joinAnnouncementDecidedAt)))
      .returning({ id: profiles.id });

    if (claimed.length === 0) return false;

    if (announce) {
      await tx.insert(feedItems).values({
        entityType: MEMBER_JOINED_ENTITY_TYPE,
        entityId: userId,
        actorId: userId,
      });
    }
    return true;
  });
}

/**
 * Delete the caller's own arrival announcement together with the likes it
 * received (likes have no FK to cascade through — see the `likes` TSDoc).
 *
 * Scoped by `actor_id` as well as id and type, so an id belonging to someone
 * else's card, or to a feed row of another type, deletes nothing.
 *
 * @returns `true` if a card was deleted.
 */
export async function deleteOwnJoinAnnouncement(
  userId: string,
  feedItemId: string
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(feedItems)
      .where(
        and(
          eq(feedItems.id, feedItemId),
          eq(feedItems.entityType, MEMBER_JOINED_ENTITY_TYPE),
          eq(feedItems.actorId, userId)
        )
      )
      .returning({ id: feedItems.id });

    if (deleted.length === 0) return false;

    await tx
      .delete(likes)
      .where(and(eq(likes.targetType, MEMBER_JOINED_LIKE_TARGET), eq(likes.targetId, feedItemId)));
    return true;
  });
}

/**
 * Owner of a live arrival announcement, or `null` when the feed row is gone
 * (deleted by its owner or reaped) or is not an announcement at all.
 */
export async function getJoinAnnouncementOwnerId(feedItemId: string): Promise<string | null> {
  const [row] = await db
    .select({ actorId: feedItems.actorId })
    .from(feedItems)
    .where(and(eq(feedItems.id, feedItemId), eq(feedItems.entityType, MEMBER_JOINED_ENTITY_TYPE)))
    .limit(1);
  return row?.actorId ?? null;
}
