import type { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { attachPostFenFromForm } from '@/app/[locale]/(public)/topics/_actions/attachPostFen';
import { attachPostPgn } from '@/app/[locale]/(public)/topics/_actions/attachPostPgn';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { removePostAttachment } from '@/app/[locale]/(public)/topics/_actions/removePostAttachment';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import type { getCommentTreePageForTopic } from '@/app/[locale]/(public)/topics/_lib/queries';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createMoveReplyForImageAttach } from '../_actions/createMoveReplyForImageAttach';
import { createMoveReplyWithAttachment } from '../_actions/createMoveReplyWithAttachment';
import { createMoveReplyWithFenAttachment } from '../_actions/createMoveReplyWithFenAttachment';
import { toggleMovePostLike } from '../_actions/toggleMovePostLike';

type Props = {
  locale: Locale;
  repertoireId: string;
  lineNo: number;
  /** 1-based half-move in focus — for the compose redirect / list link only. */
  ply: number;
  /** Position-based thread key (`${repertoireId}_${positionHash}`). */
  topicKey: string;
  /** The line's own moves + root — see the prop TSDoc on `MoveCommentsSection`. */
  moveNotationLine: MoveNotationLine;
  userId: string | undefined;
  /** One `getCommentTreePageForTopic` batch (page roots + their reply trees). */
  comments: Awaited<ReturnType<typeof getCommentTreePageForTopic>>['posts'];
  attachments: Awaited<ReturnType<typeof getAttachmentsForPosts>>;
};

/**
 * One rendered batch of a move's comment tree: `buildCommentTree` +
 * `<CommentTree>` with the line page's action wiring. Sort is fixed to
 * 'new' — the section has no sort control (per-move volume is low).
 *
 * Extracted from `MoveCommentsSection` so the SSR'd first batch and every
 * batch returned by the `loadMoreMoveComments` Server Action render through
 * the SAME component — the incremental batches cannot drift from what the
 * page shows (issue #81's uniformity requirement, applied within the page).
 */
export function MoveCommentTreeBatch({
  locale,
  repertoireId,
  lineNo,
  ply,
  topicKey,
  moveNotationLine,
  userId,
  comments,
  attachments,
}: Props) {
  const commentTree = buildCommentTree(comments, 'new');

  return (
    <CommentTree
      comments={commentTree}
      locale={locale}
      topicKey={topicKey}
      currentUserId={userId}
      enableSpoiler={false}
      redirectPath={`/${locale}/repertoires/${repertoireId}/lines/${lineNo}?move=${ply}`}
      toggleLikeAction={toggleMovePostLike}
      replyAttachmentActions={{
        pgn: createMoveReplyWithAttachment,
        fen: createMoveReplyWithFenAttachment,
        image: createMoveReplyForImageAttach,
      }}
      deletePostAction={deletePost}
      editPostAction={editPost}
      removeAttachmentAction={removePostAttachment}
      attachPgnAction={attachPostPgn}
      attachFenAction={attachPostFenFromForm}
      attachmentsByPostId={attachments}
      moveNotationLine={moveNotationLine}
      i18n={{
        likeNamespace: 'topics.repertoire_move',
        replyNamespace: 'topics.repertoire_move.replies',
        deleteNamespace: 'topics.repertoire_move.deletePost',
      }}
    />
  );
}
