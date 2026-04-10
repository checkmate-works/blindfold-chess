'use server';

import { and, eq } from 'drizzle-orm';

import { getAuthenticatedUser, getOptionalUser } from '@/lib/auth';
import { db, notifications } from '@/lib/db';

import { getUnreadCount as getUnreadCountQuery } from '../_lib/queries';

export async function getUnreadCount(): Promise<number> {
  const user = await getOptionalUser();
  if (!user) return 0;
  return getUnreadCountQuery(user.id);
}

export async function markAsRead(notificationId: string): Promise<void> {
  const user = await getAuthenticatedUser();

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));
}

export async function markAllAsRead(): Promise<void> {
  const user = await getAuthenticatedUser();

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
}
