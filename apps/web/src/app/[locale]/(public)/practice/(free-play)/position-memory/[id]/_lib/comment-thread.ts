import type { CommentThreadWiring } from '@/app/[locale]/(public)/topics/_components/CommentTreeBatch';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createReplyForImageAttach } from '../_actions/createReplyForImageAttach';
import { createReplyWithAttachment } from '../_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from '../_actions/createReplyWithFenAttachment';
import { togglePositionMemoryPostLike } from '../_actions/togglePositionMemoryPostLike';

/**
 * Comment-thread wiring for `/practice/position-memory/[id]`. No spoiler —
 * there is no solution to hide, unlike a puzzle.
 *
 * Consumed by the page's SSR'd first batch and by
 * `loadMorePositionMemoryComments`, so both describe the thread identically.
 */
export function positionMemoryCommentThread(
  locale: Locale,
  positionId: string
): CommentThreadWiring {
  return {
    topicKey: positionId,
    redirectPath: `/${locale}/practice/position-memory/${positionId}`,
    toggleLikeAction: togglePositionMemoryPostLike,
    replyAttachmentActions: {
      pgn: createReplyWithAttachment,
      fen: createReplyWithFenAttachment,
      image: createReplyForImageAttach,
    },
    i18nNamespace: 'topics.positionMemory',
  };
}
