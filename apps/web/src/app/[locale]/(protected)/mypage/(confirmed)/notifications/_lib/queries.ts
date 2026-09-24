import { type SQL, and, desc, eq } from 'drizzle-orm';

import { db, notifications, profiles } from '@/lib/db';
import { countRows } from '@/lib/db/list-query';
import { excludeBlockedAuthors } from '@/lib/moderation/block';
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

/**
 * The recipient's notifications, less those whose actor is in a block with
 * them in either direction.
 *
 * `createNotification` stops new rows from a blocked actor at write time, but
 * that only covers what happens after the block. Everything the other party
 * did before it — a follow, a like, a reply — is still stored, and without
 * this filter it would keep putting their name and avatar in front of the
 * user who blocked them. The rows are hidden rather than deleted so an unblock
 * brings the history back unchanged.
 *
 * Actor-less rows (announcements, grants, review results) have a null
 * `actor_id`, which the filter's `IS NULL` arm keeps.
 *
 * Every read here is scoped to the one recipient and none is cached, so the
 * count, the list and {@link getUnreadCount} can all narrow per viewer
 * without leaking anything, and they must agree with each other.
 */
async function visibleTo(userId: string, ...conditions: SQL[]): Promise<SQL | undefined> {
  return and(
    eq(notifications.userId, userId),
    ...conditions,
    await excludeBlockedAuthors(notifications.actorId, userId)
  );
}

export async function getNotifications(
  userId: string,
  page: number = 1
): Promise<{ items: NotificationWithActor[]; totalPages: number }> {
  const where = await visibleTo(userId);
  const totalCount = await countRows(notifications, where);
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
    .where(where)
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

/**
 * Unread notifications for the header badge, filtered like the list: a hidden
 * row the user can never open would otherwise hold the badge lit until they
 * found "mark all as read".
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return countRows(notifications, await visibleTo(userId, eq(notifications.isRead, false)));
}
