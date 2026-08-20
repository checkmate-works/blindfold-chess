/**
 * Every notification `type` value the app emits, as one closed union.
 *
 * The `notifications.type` column is varchar (deliberately, to avoid ALTER
 * TYPE migrations), so nothing at the DB level constrains the set — this
 * list is the single registry. It is wired so the set cannot silently
 * drift:
 *
 * - {@link NotificationEvent} (`notification.ts`) types its `type` field as
 *   {@link NotificationType}, so emitting a new value forces adding it here.
 * - `buildNotificationMessage` / `buildNotificationLink` (the notifications
 *   page) close their dispatch with a `never` check over this union, so a
 *   value added here fails their build until both render a real message and
 *   link — previously a new type shipped as an "unknownNotification" row
 *   with no link, silently.
 *
 * These are **stored data values** — never rename a member; retired members
 * may live on in old rows (the read-side dispatches stay runtime-tolerant
 * for exactly that reason).
 */
export const NOTIFICATION_TYPES = [
  'follow',
  'like',
  'reply',
  'new_post',
  'new_comment_on_topic',
  'new_position',
  'puzzle_forked',
  'memory_forked',
  'new_chunk_draft',
  'chunk_published',
  'new_game',
  'game_chunk_linked',
  'repertoire_chunk_linked',
  'chunk_edit_request_submitted',
  'chunk_edit_request_accepted',
  'position_edit_request_submitted',
  'position_edit_request_accepted',
  'announcement',
  'benefit_grant',
  'rank_grant',
  'point_grant',
  'like_coin_grant',
  'achievement_granted',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
