import type { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { attachPostFenFromForm } from '@/app/[locale]/(public)/topics/_actions/attachPostFen';
import { attachPostPgn } from '@/app/[locale]/(public)/topics/_actions/attachPostPgn';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { removePostAttachment } from '@/app/[locale]/(public)/topics/_actions/removePostAttachment';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import type { getCommentTreePageForTopic } from '@/app/[locale]/(public)/topics/_lib/queries';
import type { SortMode } from '@/app/[locale]/(public)/topics/_lib/shared';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createReplyForImageAttach } from '../_actions/createReplyForImageAttach';
import { createReplyWithAttachment } from '../_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from '../_actions/createReplyWithFenAttachment';
import { toggleRepertoirePostLike } from '../_actions/toggleRepertoirePostLike';

type Props = {
  locale: Locale;
  repertoireId: string;
  userId: string | undefined;
  /** One `getCommentTreePageForTopic` batch (page roots + their reply trees). */
  comments: Awaited<ReturnType<typeof getCommentTreePageForTopic>>['posts'];
  attachments: Awaited<ReturnType<typeof getAttachmentsForPosts>>;
  sortBy: SortMode;
};

/**
 * One rendered batch of the repertoire comment tree: `buildCommentTree` +
 * `<CommentTree>` with the repertoire page's action wiring.
 *
 * Extracted from `RepertoireCommentsSection` so the SSR'd first batch and
 * every batch returned by the `loadMoreRepertoireComments` Server Action
 * render through the SAME component — the incremental batches cannot drift
 * from what the page shows (issue #81's uniformity requirement, applied
 * within the page).
 */
export function RepertoireCommentTreeBatch({
  locale,
  repertoireId,
  userId,
  comments,
  attachments,
  sortBy,
}: Props) {
  const commentTree = buildCommentTree(comments, sortBy);

  return (
    <CommentTree
      comments={commentTree}
      locale={locale}
      topicKey={repertoireId}
      currentUserId={userId}
      enableSpoiler={false}
      redirectPath={`/${locale}/repertoires/${repertoireId}`}
      toggleLikeAction={toggleRepertoirePostLike}
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
      i18n={{
        likeNamespace: 'topics.repertoire',
        replyNamespace: 'topics.repertoire.replies',
        deleteNamespace: 'topics.repertoire.deletePost',
      }}
    />
  );
}
