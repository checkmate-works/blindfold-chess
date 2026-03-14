import { and, count, desc, eq } from 'drizzle-orm';

import { db, notifications, profiles } from '@/lib/db';

const PAGE_SIZE = 20;

export type NotificationWithActor = {
  id: string;
  type: string;
  targetType: string | null;
  targetId: string | null;
  groupKey: string | null;
  metadata: unknown;
  isRead: boolean;
  createdAt: Date;
  actor: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

export async function getNotifications(
  userId: string,
  page: number = 1
): Promise<{ items: NotificationWithActor[]; totalPages: number }> {
  const [countResult] = await db
    .select({ count: count() })
    .from(notifications)
    .where(eq(notifications.userId, userId));

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
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      actorUsername: profiles.username,
      actorDisplayName: profiles.displayName,
      actorAvatarUrl: profiles.avatarUrl,
    })
    .from(notifications)
    .leftJoin(profiles, eq(notifications.actorId, profiles.id))
    .where(eq(notifications.userId, userId))
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
    isRead: row.isRead,
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

export async function getUnreadCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return result.count;
}
