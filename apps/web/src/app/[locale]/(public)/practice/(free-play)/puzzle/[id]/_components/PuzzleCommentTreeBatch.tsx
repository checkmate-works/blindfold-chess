import { getTranslations } from 'next-intl/server';

import type { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { attachPostFenFromForm } from '@/app/[locale]/(public)/topics/_actions/attachPostFen';
import { attachPostPgn } from '@/app/[locale]/(public)/topics/_actions/attachPostPgn';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { removePostAttachment } from '@/app/[locale]/(public)/topics/_actions/removePostAttachment';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { buildAttachmentNodeMap } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import type { getCommentTreePageForTopic } from '@/app/[locale]/(public)/topics/_lib/queries';
import type { SortMode } from '@/app/[locale]/(public)/topics/_lib/shared';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createReplyForImageAttach } from '../_actions/createReplyForImageAttach';
import { createReplyWithAttachment } from '../_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from '../_actions/createReplyWithFenAttachment';
import { togglePositionPuzzlePostLike } from '../_actions/togglePositionPuzzlePostLike';

type Props = {
  locale: Locale;
  positionId: string;
  userId: string | undefined;
  /** One `getCommentTreePageForTopic` batch (page roots + their reply trees). */
  comments: Awaited<ReturnType<typeof getCommentTreePageForTopic>>['posts'];
  attachments: Awaited<ReturnType<typeof getAttachmentsForPosts>>;
  sortBy: SortMode;
};

/**
 * One rendered batch of the puzzle-detail comment tree: `buildCommentTree`
 * + the attachment node map + `<CommentTree>` with the puzzle page's
 * action wiring (spoiler-enabled — comments may discuss the solution).
 *
 * Extracted from the page so the SSR'd first batch and every batch
 * returned by the `loadMorePuzzleComments` Server Action render through
 * the SAME component — the incremental batches cannot drift from what
 * the page shows (issue #81's uniformity requirement, applied within
 * the page).
 */
export async function PuzzleCommentTreeBatch({
  locale,
  positionId,
  userId,
  comments,
  attachments,
  sortBy,
}: Props) {
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });

  const commentTree = buildCommentTree(comments, sortBy);

  // CommentTree threads `extraContentByPostId` through to every CommentNode
  // it spawns so attached PGN/FEN/embed/image cards render under their
  // author at any depth.
  const extraContentByPostId = buildAttachmentNodeMap(
    comments.map((c) => c.id),
    attachments,
    tVideo('fallbackTitle')
  );

  return (
    <CommentTree
      comments={commentTree}
      locale={locale}
      topicKey={positionId}
      currentUserId={userId}
      enableSpoiler
      redirectPath={`/${locale}/practice/puzzle/${positionId}`}
      toggleLikeAction={togglePositionPuzzlePostLike}
      replyAttachmentActions={{
        pgn: createReplyWithAttachment,
        fen: createReplyWithFenAttachment,
        image: createReplyForImageAttach,
      }}
      deletePostAction={deletePost}
      editPostAction={editPost}
      removeAttachmentAction={removePostAttachment}
      attachPgnAction={attachPostPgn}
      attachFenAction={attachPostFenFromForm}
      attachmentsByPostId={attachments}
      attachmentFallbackVideoTitle={tVideo('fallbackTitle')}
      extraContentByPostId={extraContentByPostId}
      i18n={{
        likeNamespace: 'topics.positionPuzzle',
        replyNamespace: 'topics.positionPuzzle.replies',
        deleteNamespace: 'topics.positionPuzzle.deletePost',
      }}
    />
  );
}
