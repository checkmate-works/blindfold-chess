'use server';

import { and, eq } from 'drizzle-orm';

import { getAuthenticatedUser, getOptionalUser } from '@/lib/auth';
import { db, notifications } from '@/lib/db';
import { isMutableNotificationType } from '@/lib/notifications/mutable-types';
import type { MutableNotificationType } from '@/lib/notifications/mutable-types';
import { getMutedNotificationTypes, setNotificationTypeMuted } from '@/lib/notifications/mutes';

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

export async function getNotificationMutes(): Promise<MutableNotificationType[]> {
  const user = await getAuthenticatedUser();
  return getMutedNotificationTypes(user.id);
}

export async function setNotificationMute(type: string, muted: boolean): Promise<void> {
  const user = await getAuthenticatedUser();
  // Defensive runtime check: this action is callable directly over the
  // network, so a caller could send a `type` outside the union despite the
  // client only ever offering MUTABLE_NOTIFICATION_TYPES as toggles.
  if (!isMutableNotificationType(type)) return;

  await setNotificationTypeMuted(user.id, type, muted);
}
