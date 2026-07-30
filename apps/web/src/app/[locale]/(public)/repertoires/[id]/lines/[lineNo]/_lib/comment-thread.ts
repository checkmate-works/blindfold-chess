import type { CommentThreadWiring } from '@/app/[locale]/(public)/topics/_components/CommentTreeBatch';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createMoveReplyForImageAttach } from '../_actions/createMoveReplyForImageAttach';
import { createMoveReplyWithAttachment } from '../_actions/createMoveReplyWithAttachment';
import { createMoveReplyWithFenAttachment } from '../_actions/createMoveReplyWithFenAttachment';
import { toggleMovePostLike } from '../_actions/toggleMovePostLike';

type Args = {
  locale: Locale;
  repertoireId: string;
  lineNo: number;
  /** 1-based half-move in focus — for the compose redirect only. */
  ply: number;
  /** Position-based thread key (`${repertoireId}_${positionHash}`). */
  topicKey: string;
  /** The line's own moves + root, anchoring move-notation linkification. */
  moveNotationLine: MoveNotationLine;
};

/**
 * Comment-thread wiring for one move on `/repertoires/[id]/lines/[lineNo]`.
 * Keyed by position rather than by ply, so the same position reached by two
 * lines shares one thread; the ply only steers the reply redirect back to the
 * move the reader was looking at.
 *
 * Consumed by `MoveCommentsSection`'s SSR'd first batch and by
 * `loadMoreMoveComments`, so both describe the thread identically.
 */
export function moveCommentThread({
  locale,
  repertoireId,
  lineNo,
  ply,
  topicKey,
  moveNotationLine,
}: Args): CommentThreadWiring {
  return {
    topicKey,
    redirectPath: `/${locale}/repertoires/${repertoireId}/lines/${lineNo}?move=${ply}`,
    toggleLikeAction: toggleMovePostLike,
    replyAttachmentActions: {
      pgn: createMoveReplyWithAttachment,
      fen: createMoveReplyWithFenAttachment,
      image: createMoveReplyForImageAttach,
    },
    i18nNamespace: 'topics.repertoire_move',
    moveNotationLine,
  };
}
