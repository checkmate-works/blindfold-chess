import { and, isNull } from 'drizzle-orm';
import 'server-only';

import { db, profiles } from './db';
import { createNotification } from './notification';

/**
 * Send notifications to all active (non-banned, non-deleted) users
 * when a members-only announcement is published.
 *
 * This is a fire-and-forget utility — failures in individual
 * notification inserts are silently handled by `createNotification`.
 */
export async function notifyAllUsersOfAnnouncement(
  announcementId: string,
  slug: string
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
      metadata: { slug },
    });
  }
}
