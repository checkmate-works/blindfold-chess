/**
 * Notification types a user may individually mute from
 * `/mypage/notifications` settings.
 *
 * @design A curated subset, not "every type in notification.ts"
 *
 * The full set of `type` string literals emitted across the app (see
 * `notification.ts`, `announcement-notification.ts`, and the various
 * `createNotification({ type: '...' })` call sites) also includes
 * `announcement`, `follow`, `like`, `reply`, `puzzle_forked`,
 * `memory_forked`, `*_grant`, `achievement_granted`, and `*_edit_request_*`.
 * Those are intentionally left out here: `announcement` carries ToS/billing-
 * relevant notices a user must not be able to silence by accident, and the
 * rest are direct consequences of another user's one-to-one action toward
 * this user (being followed, liked, replied to within a thread, having a
 * position forked from you) rather than "feed noise" from accounts they
 * follow — muting them would mean missing something addressed to them
 * specifically.
 *
 * `new_comment_on_topic` is a non-fan-out entry: "someone commented on
 * your content". Since 2026-07 it covers every commentable surface uniformly —
 * positions (memory/puzzle), repertoires (incl. move comments), chunks,
 * /topics posts (direct comments on your post; formerly typed 'reply'), and
 * shared games ('game_comment' target; see addGameCommentAction). 'reply'
 * remains the non-mutable type for replies deeper in a thread.
 *
 * `game_chunk_linked` / `repertoire_chunk_linked` are the other two, and are
 * here for the same reason rather than because they are fan-out: each is
 * unsolicited activity on the owner's content that any member can repeat per
 * move / position, so it is closer to "comments on your posts" than to a
 * one-time event addressed to the recipient (a follow, a fork). Note the mute
 * silences the notification only — the link itself still lands, since both
 * `game_chunks` and `repertoire_chunks` are suggestion layers with no
 * owner veto by construction.
 *
 * @design Removing a type from this list is safe with stale mute rows around
 *
 * `new_post` (topic posts) was removed in 2026-07: the label was unclear and
 * posts are too rare to be worth a toggle. Rows for a removed type may still
 * exist in `notification_mutes`, but every consumer degrades to "notify":
 * `createNotification` only consults mutes for types in this list, and
 * `getMutedNotificationTypes` filters by this list — so stale rows are
 * ignored, never an error.
 */
export const MUTABLE_NOTIFICATION_TYPES = [
  'new_position',
  'new_chunk_draft',
  'chunk_published',
  'new_game',
  'new_comment_on_topic',
  'game_chunk_linked',
  'repertoire_chunk_linked',
] as const;

export type MutableNotificationType = (typeof MUTABLE_NOTIFICATION_TYPES)[number];

export function isMutableNotificationType(type: string): type is MutableNotificationType {
  return (MUTABLE_NOTIFICATION_TYPES as readonly string[]).includes(type);
}
