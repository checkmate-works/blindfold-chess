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

import { createChunkReplyWithAttachment } from '../_actions/createChunkReplyWithAttachment';
import { createChunkReplyWithFenAttachment } from '../_actions/createChunkReplyWithFenAttachment';
import { toggleChunkLike } from '../_actions/toggleChunkLike';

type Props = {
  locale: Locale;
  slug: string;
  userId: string | undefined;
  /** One `getCommentTreePageForTopic` batch (page roots + their reply trees). */
  comments: Awaited<ReturnType<typeof getCommentTreePageForTopic>>['posts'];
  attachments: Awaited<ReturnType<typeof getAttachmentsForPosts>>;
  sortBy: SortMode;
  /** The chunk's position — see the prop TSDoc on `ChunkCommentsTab`. */
  representativeFen: string;
};

/**
 * One rendered batch of the chunk comment tree: `buildCommentTree` + the
 * attachment node map + `<CommentTree>` with the chunk page's action wiring.
 *
 * Extracted from `ChunkCommentsTab` so the SSR'd first batch and every
 * batch returned by the `loadMoreChunkComments` Server Action render
 * through the SAME component — the incremental batches cannot drift from
 * what the page shows (issue #81's uniformity requirement, applied within
 * the page).
 */
export async function ChunkCommentTreeBatch({
  locale,
  slug,
  userId,
  comments,
  attachments,
  sortBy,
  representativeFen,
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
      topicKey={slug}
      currentUserId={userId}
      enableSpoiler={false}
      redirectPath={`/${locale}/chunks/${slug}`}
      toggleLikeAction={toggleChunkLike}
      replyAttachmentActions={{
        pgn: createChunkReplyWithAttachment,
        fen: createChunkReplyWithFenAttachment,
      }}
      deletePostAction={deletePost}
      editPostAction={editPost}
      removeAttachmentAction={removePostAttachment}
      attachPgnAction={attachPostPgn}
      attachFenAction={attachPostFenFromForm}
      attachmentsByPostId={attachments}
      attachmentFallbackVideoTitle={tVideo('fallbackTitle')}
      extraContentByPostId={extraContentByPostId}
      moveNotationFen={representativeFen}
      i18n={{
        likeNamespace: 'topics.chunks',
        replyNamespace: 'topics.chunks.replies',
        deleteNamespace: 'topics.chunks.deletePost',
      }}
    />
  );
}
