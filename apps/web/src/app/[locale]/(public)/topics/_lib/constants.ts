export const VALID_REPLY_PERMISSIONS = ['everyone', 'followers', 'nobody'] as const;

/**
 * Topic types supported by `topic_posts.topicType`. The polymorphic
 * discriminator keys discussion threads to their underlying catalog row:
 *   - 'square'          → boards (squares topic)
 *   - 'opening'         → opening master entries
 *   - 'chunk'           → memorization chunks (catalog stays in `chunks`,
 *                         discussion lives here — see `chunks` table TSDoc)
 *   - 'position_memory' → user-generated memory positions (catalog in
 *                         `positions` with `type='memory'`; `topic_key` is
 *                         the `positions.id` UUID)
 *   - 'position_puzzle' → user-generated puzzle positions (catalog in
 *                         `positions` with `type='puzzle'`; `topic_key` is
 *                         the `positions.id` UUID). The puzzle variant is
 *                         the only topic type whose UI exposes the
 *                         spoiler-flag toggle today.
 *
 * `position_memory` and `position_puzzle` are kept as two distinct values
 * (rather than a single `'position'`) so the `topic_type` column alone
 * remains sufficient to recover the `positions.type` discriminator without
 * a JOIN — keeping URL/route mapping (see `deletePost`) and per-type UI
 * branching (e.g. spoiler toggle) trivially `switch`-able.
 */
export type TopicType = 'square' | 'opening' | 'chunk' | 'position_memory' | 'position_puzzle';
