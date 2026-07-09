import { and, eq, inArray } from 'drizzle-orm';
import 'server-only';

import { db, notificationMutes } from '../db';
import { MUTABLE_NOTIFICATION_TYPES, type MutableNotificationType } from './mutable-types';

/** Point lookup used by {@link createNotification} before every insert. */
export async function isNotificationTypeMuted(userId: string, type: string): Promise<boolean> {
  const [row] = await db
    .select({ id: notificationMutes.id })
    .from(notificationMutes)
    .where(and(eq(notificationMutes.userId, userId), eq(notificationMutes.type, type)))
    .limit(1);

  return row !== undefined;
}

/** Used to pre-fill the settings toggle list. */
export async function getMutedNotificationTypes(
  userId: string
): Promise<MutableNotificationType[]> {
  const rows = await db
    .select({ type: notificationMutes.type })
    .from(notificationMutes)
    .where(
      and(
        eq(notificationMutes.userId, userId),
        inArray(notificationMutes.type, MUTABLE_NOTIFICATION_TYPES)
      )
    );

  return rows.map((row) => row.type as MutableNotificationType);
}

export async function setNotificationTypeMuted(
  userId: string,
  type: MutableNotificationType,
  muted: boolean
): Promise<void> {
  if (muted) {
    await db.insert(notificationMutes).values({ userId, type }).onConflictDoNothing();
  } else {
    await db
      .delete(notificationMutes)
      .where(and(eq(notificationMutes.userId, userId), eq(notificationMutes.type, type)));
  }
}
