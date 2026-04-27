export const VALID_REPLY_PERMISSIONS = ['everyone', 'followers', 'nobody'] as const;

export type ReplyPermission = (typeof VALID_REPLY_PERMISSIONS)[number];

/**
 * Topic types supported by `topic_posts.topicType`. The polymorphic
 * discriminator keys discussion threads to their underlying catalog row:
 *   - 'square'  → boards (squares topic)
 *   - 'opening' → opening master entries
 *   - 'chunk'   → memorization chunks (catalog stays in `chunks`,
 *                 discussion lives here — see `chunks` table TSDoc)
 */
export const TOPIC_TYPES = ['square', 'opening', 'chunk'] as const;

export type TopicType = (typeof TOPIC_TYPES)[number];
