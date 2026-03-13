'use server';

import { and, count, desc, eq } from 'drizzle-orm';

import { getAuthenticatedUser, getOptionalUser } from '@/lib/auth';
import { db, notifications, profiles } from '@/lib/db';

const PAGE_SIZE = 20;

export type NotificationWithActor = {
  id: string;
  type: string;
  targetType: string | null;
  targetId: string | null;
  groupKey: string | null;
  metadata: unknown;
  read: boolean;
  createdAt: Date;
  actor: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

export async function getNotifications(
  page: number = 1
): Promise<{ items: NotificationWithActor[]; totalPages: number }> {
  const user = await getAuthenticatedUser();

  const [countResult] = await db
    .select({ count: count() })
    .from(notifications)
    .where(eq(notifications.userId, user.id));

  const totalCount = countResult.count;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      targetType: notifications.targetType,
      targetId: notifications.targetId,
      groupKey: notifications.groupKey,
      metadata: notifications.metadata,
      read: notifications.read,
      createdAt: notifications.createdAt,
      actorUsername: profiles.username,
      actorDisplayName: profiles.displayName,
      actorAvatarUrl: profiles.avatarUrl,
    })
    .from(notifications)
    .leftJoin(profiles, eq(notifications.actorId, profiles.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const items: NotificationWithActor[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    targetType: row.targetType,
    targetId: row.targetId,
    groupKey: row.groupKey,
    metadata: row.metadata,
    read: row.read,
    createdAt: row.createdAt,
    actor: row.actorUsername
      ? {
          username: row.actorUsername,
          displayName: row.actorDisplayName,
          avatarUrl: row.actorAvatarUrl,
        }
      : null,
  }));

  return { items, totalPages };
}

export async function getUnreadCount(): Promise<number> {
  const user = await getOptionalUser();

  if (!user) {
    return 0;
  }

  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));

  return result.count;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const user = await getAuthenticatedUser();

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));
}

export async function markAllAsRead(): Promise<void> {
  const user = await getAuthenticatedUser();

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
}
