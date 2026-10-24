import { and, eq } from 'drizzle-orm';
import 'server-only';

import { db, feedItems, joinAnnouncementDecisions, likes } from '@/lib/db';

import { MEMBER_JOINED_ENTITY_TYPE, MEMBER_JOINED_LIKE_TARGET } from './member-joined';

/**
 * Record the member's answer to the onboarding arrival-announcement step and,
 * when the answer is yes, post the card.
 *
 * The `join_announcement_decisions` primary key is the claim: only the
 * request whose INSERT lands posts the card, so a double submit, a second tab,
 * or a return visit after deleting the card cannot post again. A member who
 * predates the feature already has a `not_offered` row and falls out the same
 * way. The caller must have checked that the member has a profile — the card
 * renders from it.
 *
 * @returns `true` if this call recorded the answer, `false` if it was already
 *   recorded (nothing changed).
 */
export async function decideJoinAnnouncement(userId: string, announce: boolean): Promise<boolean> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .insert(joinAnnouncementDecisions)
      .values({ userId, outcome: announce ? 'announced' : 'declined' })
      .onConflictDoNothing()
      .returning({ userId: joinAnnouncementDecisions.userId });

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
 * Whether the member has already answered the arrival-announcement step (or
 * predates it). The onboarding page leaves the step out when this is true.
 */
export async function hasJoinAnnouncementDecision(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: joinAnnouncementDecisions.userId })
    .from(joinAnnouncementDecisions)
    .where(eq(joinAnnouncementDecisions.userId, userId))
    .limit(1);
  return row != null;
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
