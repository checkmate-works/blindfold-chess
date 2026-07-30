import { getTranslations } from 'next-intl/server';

import type { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import type { Locale } from '@/app/[locale]/_lib/types';

import { attachPostFenFromForm } from '../_actions/attachPostFen';
import { attachPostPgn } from '../_actions/attachPostPgn';
import { deletePost } from '../_actions/deletePost';
import { editPost } from '../_actions/editPost';
import { removePostAttachment } from '../_actions/removePostAttachment';
import type { ToggleLikeAction } from '../_lib/action-types';
import { buildCommentTree } from '../_lib/comment-tree';
import type { MoveNotationLine } from '../_lib/move-notation';
import type { getCommentTreePageForTopic } from '../_lib/queries';
import type { SortMode } from '../_lib/shared';
import { CommentTree } from './CommentTree';
import type { ReplyAttachmentActions } from './ReplyForm';
import { buildAttachmentNodeMap } from './render-attachment';

/**
 * Everything that distinguishes one commentable surface's thread from
 * another's. The edit / delete / attach actions are NOT here: those are
 * topic-agnostic and wired identically on every surface, so they live in
 * {@link CommentTreeBatch} itself.
 *
 * Each surface builds this once, in a `_lib/comment-thread.ts` factory, and
 * both its SSR'd first batch and its `loadMoreXComments` Server Action feed
 * the same object in — so the two paths cannot describe the thread
 * differently.
 */
export type CommentThreadWiring = {
  /** `topic_posts.topicKey` for this thread. */
  topicKey: string;
  /** Where a reply's post-submit redirect lands. Locale-prefixed. */
  redirectPath: string;
  toggleLikeAction: ToggleLikeAction;
  replyAttachmentActions: ReplyAttachmentActions;
  /**
   * i18n namespace root for this surface (e.g. `'topics.positionPuzzle'`).
   * The like / reply / delete namespaces derive from it by the convention
   * every surface already followed: `<root>`, `<root>.replies`,
   * `<root>.deletePost`.
   */
  i18nNamespace: string;
  /** Only puzzle threads hide comment bodies behind a spoiler by default. */
  enableSpoiler?: boolean;
  /** Anchor position for move-notation linkification (chunk threads). */
  moveNotationFen?: string;
  /** Anchor line for move-notation linkification (repertoire move threads). */
  moveNotationLine?: MoveNotationLine;
};

type Props = CommentThreadWiring & {
  locale: Locale;
  /** `undefined` when the reader is anonymous. */
  userId: string | undefined;
  /** One `getCommentTreePageForTopic` batch (page roots + their reply trees). */
  comments: Awaited<ReturnType<typeof getCommentTreePageForTopic>>['posts'];
  attachments: Awaited<ReturnType<typeof getAttachmentsForPosts>>;
  sortBy: SortMode;
};

/**
 * One rendered batch of a comment tree: `buildCommentTree` + the attachment
 * node map + `<CommentTree>` with the surface's action wiring.
 *
 * Rendering batches through a single component is what keeps a page's SSR'd
 * first batch and the batches its `loadMoreXComments` Server Action returns
 * from drifting apart (issue #81's uniformity requirement). This component
 * extends that guarantee across surfaces: position-memory, puzzle, chunk,
 * repertoire and repertoire-move threads had five hand-maintained copies of
 * this wiring, and the repertoire pair had already fallen behind — they
 * passed `attachmentsByPostId` (which only powers the edit-side remove
 * buttons) without `extraContentByPostId`, so an attachment on a repertoire
 * or move comment was accepted on submit and then never rendered. Building
 * the node map unconditionally here fixes both threads.
 */
export async function CommentTreeBatch({
  locale,
  topicKey,
  redirectPath,
  toggleLikeAction,
  replyAttachmentActions,
  i18nNamespace,
  enableSpoiler = false,
  moveNotationFen,
  moveNotationLine,
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
      topicKey={topicKey}
      currentUserId={userId}
      enableSpoiler={enableSpoiler}
      redirectPath={redirectPath}
      toggleLikeAction={toggleLikeAction}
      replyAttachmentActions={replyAttachmentActions}
      deletePostAction={deletePost}
      editPostAction={editPost}
      removeAttachmentAction={removePostAttachment}
      attachPgnAction={attachPostPgn}
      attachFenAction={attachPostFenFromForm}
      attachmentsByPostId={attachments}
      attachmentFallbackVideoTitle={tVideo('fallbackTitle')}
      extraContentByPostId={extraContentByPostId}
      moveNotationFen={moveNotationFen}
      moveNotationLine={moveNotationLine}
      i18n={{
        likeNamespace: i18nNamespace,
        replyNamespace: `${i18nNamespace}.replies`,
        deleteNamespace: `${i18nNamespace}.deletePost`,
      }}
    />
  );
}
