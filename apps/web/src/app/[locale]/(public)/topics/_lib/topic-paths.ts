import type { TopicType } from './constants';

/**
 * The URL segment a topic type appears under in `/topics/<segment>/…`.
 *
 * Only `square` and `opening` have such a route — the other topic types host
 * their discussion on the entity's own page (a chunk, a position, a kata) and
 * never reach this. `opening` is the one type whose plural is not the type
 * name plus `s`.
 *
 * Three callers spelled this rule out: the notification deep-link builder, the
 * grant-history link builder, and the coin-history link builder. The second
 * one's comment even said it mirrored the first.
 */
export function topicSegment(topicType: TopicType | string): string {
  return topicType === 'opening' ? 'openings' : `${topicType}s`;
}

/**
 * The post-detail page for a topic type that has one — the page that renders
 * the OP plus its reply tree. Callers append `#post-<replyId>` themselves when
 * they are linking at a reply rather than the post.
 */
export function buildTopicPostPath(
  topicType: TopicType | string,
  topicKey: string,
  postId: string
): string {
  return `/topics/${topicSegment(topicType)}/${topicKey}/posts/${postId}`;
}
