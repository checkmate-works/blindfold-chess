import type { CommentThreadWiring } from '@/app/[locale]/(public)/topics/_components/CommentTreeBatch';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createChunkReplyWithAttachment } from '../_actions/createChunkReplyWithAttachment';
import { createChunkReplyWithFenAttachment } from '../_actions/createChunkReplyWithFenAttachment';
import { toggleChunkLike } from '../_actions/toggleChunkLike';

/**
 * Comment-thread wiring for `/chunks/[slug]`. The chunk's representative FEN
 * anchors move-notation linkification, so a legal SAN run in a comment body
 * becomes a board-preview link. Image replies are not offered here (no
 * image-attach action exists for chunk threads).
 *
 * Consumed by `ChunkCommentsTab`'s SSR'd first batch and by
 * `loadMoreChunkComments`, so both describe the thread identically.
 */
export function chunkCommentThread(
  locale: Locale,
  slug: string,
  representativeFen: string
): CommentThreadWiring {
  return {
    topicKey: slug,
    redirectPath: `/${locale}/chunks/${slug}`,
    toggleLikeAction: toggleChunkLike,
    replyAttachmentActions: {
      pgn: createChunkReplyWithAttachment,
      fen: createChunkReplyWithFenAttachment,
    },
    i18nNamespace: 'topics.chunks',
    moveNotationFen: representativeFen,
  };
}
