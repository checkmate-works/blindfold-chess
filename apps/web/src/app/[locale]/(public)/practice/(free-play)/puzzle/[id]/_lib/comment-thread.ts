import type { CommentThreadWiring } from '@/app/[locale]/(public)/topics/_components/CommentTreeBatch';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createReplyForImageAttach } from '../_actions/createReplyForImageAttach';
import { createReplyWithAttachment } from '../_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from '../_actions/createReplyWithFenAttachment';
import { togglePositionPuzzlePostLike } from '../_actions/togglePositionPuzzlePostLike';

/**
 * Comment-thread wiring for `/practice/puzzle/[id]`. Spoiler-enabled —
 * comments may discuss the solution, so bodies stay hidden until revealed.
 *
 * Consumed by the page's SSR'd first batch and by `loadMorePuzzleComments`,
 * so both describe the thread identically.
 */
export function puzzleCommentThread(locale: Locale, positionId: string): CommentThreadWiring {
  return {
    topicKey: positionId,
    redirectPath: `/${locale}/practice/puzzle/${positionId}`,
    toggleLikeAction: togglePositionPuzzlePostLike,
    replyAttachmentActions: {
      pgn: createReplyWithAttachment,
      fen: createReplyWithFenAttachment,
      image: createReplyForImageAttach,
    },
    enableSpoiler: true,
    i18nNamespace: 'topics.positionPuzzle',
  };
}
