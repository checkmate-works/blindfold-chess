/**
 * Arrival announcement (参加告知) — the "〇〇 joined" card a new member may
 * choose to post to the home feed from the onboarding wizard.
 *
 * @description
 * One `feed_items` row per member, `entity_type = 'member_joined'`, with both
 * `entity_id` and `actor_id` set to the member's profile id: the member *is*
 * the subject, there is no separate entity table. The card shows the avatar,
 * display name and country chip and links to the profile, where the bio can be
 * read; it takes likes (owner notified) but no replies.
 *
 * Kept free of `server-only` and of DB imports so the client card and the
 * onboarding step can share these constants with the server side.
 *
 * @design Opt-in, one-shot, removable, temporary
 * - Opt-in: nothing is posted unless the member presses "post" on the
 *   onboarding step, which previews the exact card first.
 * - One-shot: the answer is recorded in `join_announcement_decisions` (see
 *   its TSDoc); a deleted or expired card is never offered again.
 * - Removable: the owner deletes it from the card's "⋯" menu.
 * - Temporary: {@link MEMBER_JOINED_RETENTION_DAYS} days, enforced by the same
 *   daily reaper as rank-update cards. The step's copy promises this number,
 *   so the copy and the reaper must read it from here.
 *
 * @design Home feed only
 * The profile timeline excludes this type ({@link PROFILE_TIMELINE_EXCLUDED_ENTITY_TYPES}):
 * "joined" is news for other members, not part of the member's own activity
 * history, and a month later it would sit at the bottom of every new member's
 * timeline as its oldest entry until the reaper removed it.
 */

/** `feed_items.entity_type` of an arrival announcement. */
export const MEMBER_JOINED_ENTITY_TYPE = 'member_joined';

/**
 * `likes.target_type` for a like on an arrival announcement. The like targets
 * the `feed_items.id` — the announcement has no other row of its own, and
 * keying on the feed row means deleting the card can delete its likes by id.
 */
export const MEMBER_JOINED_LIKE_TARGET = 'member_joined';

/** How long an arrival announcement stays on the feed before it is reaped. */
export const MEMBER_JOINED_RETENTION_DAYS = 30;

/** Entity types the public profile timeline never shows. */
export const PROFILE_TIMELINE_EXCLUDED_ENTITY_TYPES = [MEMBER_JOINED_ENTITY_TYPE] as const;
