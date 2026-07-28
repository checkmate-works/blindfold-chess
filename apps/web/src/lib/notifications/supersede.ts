/**
 * Notification types that describe the SAME underlying event from different
 * angles, and which of them wins when both would land on one recipient.
 *
 * @design Why a priority table is needed at all
 *
 * Several actions emit both a follower fan-out ("X posted") and a direct
 * notification to the one person the action was aimed at ("X commented on
 * YOUR post"). When that person also follows the actor, they are in both
 * audiences and receive two rows for one action. The dedup check in
 * {@link createNotification} cannot collapse them because its key includes
 * `type`, and the two rows differ in exactly that column — everything else
 * (recipient, actor, `target_type`, `target_id`) is identical.
 *
 * Known collisions, both reproduced 2026-07-28:
 * - a comment on someone's content: `new_post` (fan-out from
 *   `notifyFollowersOfNewPost`) vs `new_comment_on_topic` (from
 *   `notifyTopicAuthorOfNewComment`) — same `topic_post` id;
 * - a fork of someone's position: `new_position` (fan-out from
 *   `notifyFollowersOfNewPosition`) vs `puzzle_forked` / `memory_forked`
 *   (from `notifyPositionForked`) — same new `position` id.
 *
 * @design Explicit classes, NOT a blanket type-agnostic dedup
 *
 * Dropping `type` from the dedup key altogether would also swallow genuinely
 * distinct events that happen to share a target: liking a post and then
 * replying to it produces `like` and `reply` rows with the same
 * (recipient, actor, `topic_post`, post id) tuple, and both are worth
 * telling the recipient about. Only types listed together below suppress
 * each other; every other type keeps the exact-type dedup it always had.
 *
 * @design Tiers, so "equal priority" stays expressible
 *
 * Each class is a list of tiers, most specific first. A type is superseded by
 * any type in an earlier tier and supersedes every type in a later one.
 * Members of the same tier neither supersede nor are superseded — they fall
 * back to first-write-wins, which is what the exact-type dedup already did.
 * `puzzle_forked` and `memory_forked` share a tier because one position
 * creation emits exactly one of them, so their relative order is meaningless
 * and inventing one would be a lie about the domain.
 */
const SUPERSEDE_CLASSES: readonly (readonly (readonly string[])[])[] = [
  // A comment on your content beats "someone you follow posted".
  [['new_comment_on_topic'], ['new_post']],
  // A fork of your position beats "someone you follow added a position".
  [['puzzle_forked', 'memory_forked'], ['new_position']],
];

export type SupersedeRule = {
  /**
   * Types whose presence in the group suppresses the incoming notification —
   * the incoming type itself plus everything ranked above it. Includes the
   * incoming type so the exact-type dedup stays covered by the same query.
   */
  dominatingTypes: readonly string[];
  /**
   * Types the incoming notification makes redundant — everything ranked
   * below it. Rows of these types already in the group are deleted after
   * the insert.
   */
  dominatedTypes: readonly string[];
};

/**
 * Resolve the supersede rule for a notification type, or `null` when the type
 * takes part in no collision class (the common case — those keep the plain
 * exact-type dedup).
 */
export function resolveSupersedeRule(type: string): SupersedeRule | null {
  for (const tiers of SUPERSEDE_CLASSES) {
    const tierIndex = tiers.findIndex((tier) => tier.includes(type));
    if (tierIndex === -1) continue;

    return {
      dominatingTypes: tiers.slice(0, tierIndex + 1).flat(),
      dominatedTypes: tiers.slice(tierIndex + 1).flat(),
    };
  }

  return null;
}
