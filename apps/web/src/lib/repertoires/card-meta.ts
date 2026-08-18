import { EMPTY_LIKE_META, type LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';

import { getRepertoireLikeMetaMap } from './like-queries';

/** The social counters a repertoire card renders in its footer. */
export type RepertoireCardMeta = {
  likeMeta: LikeMeta;
  replyMeta: ReplyMeta;
};

const NO_META: RepertoireCardMeta = { likeMeta: EMPTY_LIKE_META, replyMeta: EMPTY_REPLY_META };

/**
 * Load the like + reply counters for a page of repertoire cards, and return a
 * lookup over them. The two queries are independent, so they run together; an
 * unliked / unanswered repertoire has no row in either, hence the zeroed
 * fallback — which lives here rather than at each card.
 */
export async function getRepertoireCardMeta(
  repertoireIds: string[],
  viewerId?: string
): Promise<(repertoireId: string) => RepertoireCardMeta> {
  if (repertoireIds.length === 0) return () => NO_META;

  const [likeMetaMap, replyMetaMap] = await Promise.all([
    getRepertoireLikeMetaMap(repertoireIds, viewerId),
    getReplyMetaMap('repertoire', repertoireIds),
  ]);

  return (repertoireId) => ({
    likeMeta: likeMetaMap.get(repertoireId) ?? EMPTY_LIKE_META,
    replyMeta: replyMetaMap.get(repertoireId) ?? EMPTY_REPLY_META,
  });
}
