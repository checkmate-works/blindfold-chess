import { and, eq, isNull } from 'drizzle-orm';
import 'server-only';

import { db, notifications, profiles } from './db';
import { createNotification } from './notification';

/**
 * Check whether a notification has already been sent for the given announcement.
 * Returns true if at least one notification record exists with
 * targetType='announcement' and targetId=announcementId.
 */
export async function hasAnnouncementNotification(announcementId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(eq(notifications.targetType, 'announcement'), eq(notifications.targetId, announcementId))
    )
    .limit(1);

  return !!existing;
}

/**
 * Send notifications to all active (non-banned, non-deleted) users
 * when an announcement is published.
 *
 * This is a fire-and-forget utility — failures in individual
 * notification inserts are silently handled by `createNotification`.
 */
export async function notifyAllUsersOfAnnouncement(
  announcementId: string,
  slug: string,
  title: string
): Promise<void> {
  const users = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(isNull(profiles.bannedAt), isNull(profiles.deletedAt)));

  for (const user of users) {
    createNotification({
      userId: user.id,
      type: 'announcement',
      targetType: 'announcement',
      targetId: announcementId,
      metadata: { slug, title },
    });
  }
}
