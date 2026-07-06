import { getTranslations } from 'next-intl/server';

import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { buildAttachmentNodeMap } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import type { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createChunkReplyWithAttachment } from '../_actions/createChunkReplyWithAttachment';
import { createChunkReplyWithFenAttachment } from '../_actions/createChunkReplyWithFenAttachment';
import { toggleChunkLike } from '../_actions/toggleChunkLike';
import type { ChunkDetailData } from '../_lib/load-chunk-detail';
import { NewPostForm } from './NewPostForm';

/**
 * The Comments tab panel of the chunk detail page: the new-post affordance
 * (inline form for the signed-in first commenter, "Join the conversation"
 * toggle otherwise), the sort control, and the threaded comment tree with
 * per-post attachment cards. Server component — builds the tree and the
 * attachment node map from the already-loaded rows and fetches only the
 * translations it renders.
 */
export async function ChunkCommentsTab({
  locale,
  slug,
  userId,
  commentCount,
  allComments,
  attachments,
  sortBy,
  representativeFen,
}: {
  locale: Locale;
  slug: string;
  userId: string | undefined;
  commentCount: number;
  allComments: ChunkDetailData['allComments'];
  attachments: ChunkDetailData['attachments'];
  sortBy: ReturnType<typeof validateSort>;
  /**
   * The chunk's position. Threaded into CommentTree so a legal SAN run in a
   * comment (e.g. "Bxa7 b6") is rendered as a clickable board-preview link —
   * the chunk has one position, so every comment branches from this FEN.
   */
  representativeFen: string;
}) {
  const [tTopics, tVideo] = await Promise.all([
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'postVideoAttachmentRender' }),
  ]);

  const commentTree = buildCommentTree(allComments, sortBy);

  // CommentTree threads `extraContentByPostId` through to every CommentNode
  // it spawns so attached PGN/FEN/embed/image cards render under their
  // author at any depth.
  const extraContentByPostId = buildAttachmentNodeMap(
    allComments.map((c) => c.id),
    attachments,
    tVideo('fallbackTitle')
  );

  return (
    <>
      {/*
       * Logged-out users get the same "Join the conversation" button as
       * every other comment surface (puzzle / position-memory / repertoire
       * / topic posts) — JoinConversationToggle's auth guard opens the
       * "sign in to continue" modal on click — instead of a bespoke
       * inline sign-in link. The dedicated `commentCount === 0` form is
       * kept only for the signed-in author so they can post the first
       * comment without a click.
       */}
      {userId && commentCount === 0 ? (
        <NewPostForm locale={locale} slug={slug} />
      ) : (
        <JoinConversationToggle count={commentCount} joinLabel={tTopics('joinConversation')}>
          <NewPostForm locale={locale} slug={slug} />
        </JoinConversationToggle>
      )}

      {commentTree.length > 0 && (
        <>
          <SortSelect
            basePath={`/chunks/${slug}`}
            translationKey="topics.chunks.sort"
            currentSort={sortBy}
          />
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
            extraContentByPostId={extraContentByPostId}
            moveNotationFen={representativeFen}
            i18n={{
              likeNamespace: 'topics.chunks',
              replyNamespace: 'topics.chunks.replies',
              deleteNamespace: 'topics.chunks.deletePost',
            }}
          />
        </>
      )}
    </>
  );
}
