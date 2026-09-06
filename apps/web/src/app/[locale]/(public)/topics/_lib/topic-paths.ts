import { getPositionKindForTopicType, getPositionPostAnchorPath } from '@/lib/positions/kind';
import { parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';

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

/**
 * The public page a `topic_posts` row is read on, deep-linked at the post
 * itself (or at `replyId` when linking a reply inside the thread).
 *
 * `topic_posts` is polymorphic but the routes that render it are not, so the
 * topic type decides both the page and how the post is addressed on it:
 *   - `square` / `opening` — the only types with a per-post detail page
 *     ({@link buildTopicPostPath}). It renders the OP and its replies as one
 *     `CommentNode` tree where every node carries `id="post-{id}"`, so a
 *     reply is that URL plus `#post-{replyId}`.
 *   - `position_memory` / `position_puzzle` — no detail page; the position
 *     page renders the same inline tree, so both a post and a reply are an
 *     anchor on it.
 *   - `chunk` — likewise on `/chunks/{slug}`, but the comment tree only
 *     mounts under `?tab=comments`; without the param the page opens on
 *     Positions and the anchor has no target, so the param is required.
 *   - `repertoire` — the course detail page renders the tree inline.
 *   - `repertoire_move` — `topicKey` packs `${repertoireId}_${positionHash}`
 *     and the hash is not reversible to a line here, so this routes to the
 *     position resolver, which finds a line + ply reaching that position and
 *     redirects to the move's thread. The post rides as a query parameter,
 *     not a fragment: the resolver redirects server-side and fragments never
 *     reach the server.
 *
 * The returned path carries no locale prefix.
 */
export function buildTopicPostHref(
  topicType: TopicType | string,
  topicKey: string,
  postId: string,
  replyId?: string
): string {
  const positionKind = getPositionKindForTopicType(topicType);
  if (positionKind) {
    return getPositionPostAnchorPath(positionKind, topicKey, replyId ?? postId);
  }
  const targetId = replyId ?? postId;
  if (topicType === 'repertoire') {
    return `/repertoires/${topicKey}#post-${targetId}`;
  }
  if (topicType === 'repertoire_move') {
    const parsed = parseMoveTopicKey(topicKey);
    if (parsed) {
      return `/repertoires/${parsed.repertoireId}/position/${parsed.positionHash}?post=${targetId}`;
    }
    return `/repertoires#post-${targetId}`;
  }
  if (topicType === 'chunk') {
    return `/chunks/${topicKey}?tab=comments#post-${targetId}`;
  }
  const baseUrl = buildTopicPostPath(topicType, topicKey, postId);
  return replyId ? `${baseUrl}#post-${replyId}` : baseUrl;
}
