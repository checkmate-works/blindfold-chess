import type { CommentThreadWiring } from '@/app/[locale]/(public)/topics/_components/CommentTreeBatch';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createReplyForImageAttach } from '../_actions/createReplyForImageAttach';
import { createReplyWithAttachment } from '../_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from '../_actions/createReplyWithFenAttachment';
import { toggleRepertoirePostLike } from '../_actions/toggleRepertoirePostLike';

/**
 * Comment-thread wiring for `/repertoires/[id]` — the kata's own thread, as
 * opposed to the per-move threads on its line pages.
 *
 * Consumed by `RepertoireCommentsSection`'s SSR'd first batch and by
 * `loadMoreRepertoireComments`, so both describe the thread identically.
 */
export function repertoireCommentThread(locale: Locale, repertoireId: string): CommentThreadWiring {
  return {
    topicKey: repertoireId,
    redirectPath: `/${locale}/repertoires/${repertoireId}`,
    toggleLikeAction: toggleRepertoirePostLike,
    replyAttachmentActions: {
      pgn: createReplyWithAttachment,
      fen: createReplyWithFenAttachment,
      image: createReplyForImageAttach,
    },
    i18nNamespace: 'topics.repertoire',
  };
}
