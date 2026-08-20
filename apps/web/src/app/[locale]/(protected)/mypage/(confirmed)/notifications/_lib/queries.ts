import { and, desc, eq } from 'drizzle-orm';

import { db, notifications, profiles } from '@/lib/db';
import { countRows } from '@/lib/db/list-query';
import type { NotificationType } from '@/lib/notifications/types';
import { resolvePagination } from '@/lib/pagination';
import type { AuthorProfile } from '@/lib/users/author-profile';

const PAGE_SIZE = 20;

export type NotificationWithActor = {
  id: string;
  type: NotificationType;
  targetType: string | null;
  targetId: string | null;
  groupKey: string | null;
  metadata: unknown;
  isRead: boolean;
  createdAt: Date;
  actor: AuthorProfile | null;
};

export async function getNotifications(
  userId: string,
  page: number = 1
): Promise<{ items: NotificationWithActor[]; totalPages: number }> {
  const totalCount = await countRows(notifications, eq(notifications.userId, userId));
  const { totalPages, offset } = resolvePagination(page, totalCount, PAGE_SIZE);

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
    .offset(offset);

  const items: NotificationWithActor[] = rows.map((row) => ({
    id: row.id,
    // The column is varchar, so a stale row may carry a type retired from
    // NOTIFICATION_TYPES. The cast keeps the read path exhaustively typed;
    // the message/link dispatches stay runtime-tolerant for such rows
    // (generic message, no link) rather than throwing.
    type: row.type as NotificationType,
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
  return countRows(
    notifications,
    and(eq(notifications.userId, userId), eq(notifications.isRead, false))
  );
}
