import { getTranslations } from 'next-intl/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { attachPostFenFromForm } from '@/app/[locale]/(public)/topics/_actions/attachPostFen';
import { attachPostPgn } from '@/app/[locale]/(public)/topics/_actions/attachPostPgn';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { removePostAttachment } from '@/app/[locale]/(public)/topics/_actions/removePostAttachment';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import {
  getCommentTreeForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createMoveReplyWithAttachment } from '../_actions/createMoveReplyWithAttachment';
import { createMoveReplyWithFenAttachment } from '../_actions/createMoveReplyWithFenAttachment';
import { toggleMovePostLike } from '../_actions/toggleMovePostLike';
import { NewMovePostForm } from './NewMovePostForm';

type Props = {
  locale: Locale;
  repertoireId: string;
  lineNo: number;
  /** 1-based half-move in focus — for the compose redirect / list link only. */
  ply: number;
  /** Position-based thread key (`${repertoireId}_${positionHash}`). */
  topicKey: string;
  currentUserId?: string;
};

/**
 * The comment thread for a single move, keyed to topicType 'repertoire_move'
 * (topicKey `${repertoireId}_${lineNo}_${ply}`). Reuses the shared topic_posts
 * infrastructure — identical to the repertoire / puzzle threads — so per-move
 * discussion gets replies, likes, edits, deletes and attachments for free.
 * Anonymous visitors read; composing requires sign-in.
 *
 * Server-rendered from the focused move (the `?move` param the line viewer
 * keeps in sync), so a post/edit/delete redirect lands back here and the new
 * state shows immediately. Comments are chronological (no sort control yet —
 * per-move volume is low).
 */
export async function MoveCommentsSection({
  locale,
  repertoireId,
  lineNo,
  ply,
  topicKey,
  currentUserId,
}: Props) {
  const tComments = await getTranslations({ locale, namespace: 'topics.repertoire_move' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });

  const commentCount = await getPostCountByTopicKey('repertoire_move', topicKey);
  const allComments = await getCommentTreeForTopic('repertoire_move', topicKey, currentUserId);
  const commentTree = buildCommentTree(allComments, 'new');
  const allPostIds = allComments.map((c) => c.id);
  const attachments = allPostIds.length > 0 ? await getAttachmentsForPosts(allPostIds) : new Map();

  const redirectPath = `/${locale}/repertoires/${repertoireId}/lines/${lineNo}?move=${ply}`;

  return (
    <section className="space-y-4">
      <SectionTitle>{tComments('commentsTitle')}</SectionTitle>

      {currentUserId && commentCount === 0 ? (
        <NewMovePostForm locale={locale} topicKey={topicKey} lineNo={lineNo} ply={ply} />
      ) : (
        <JoinConversationToggle count={commentCount} joinLabel={tTopics('joinConversation')}>
          <NewMovePostForm locale={locale} topicKey={topicKey} lineNo={lineNo} ply={ply} />
        </JoinConversationToggle>
      )}

      {commentTree.length > 0 && (
        <CommentTree
          comments={commentTree}
          locale={locale}
          topicKey={topicKey}
          currentUserId={currentUserId}
          enableSpoiler={false}
          redirectPath={redirectPath}
          toggleLikeAction={toggleMovePostLike}
          replyAttachmentActions={{
            pgn: createMoveReplyWithAttachment,
            fen: createMoveReplyWithFenAttachment,
          }}
          deletePostAction={deletePost}
          editPostAction={editPost}
          removeAttachmentAction={removePostAttachment}
          attachPgnAction={attachPostPgn}
          attachFenAction={attachPostFenFromForm}
          attachmentsByPostId={attachments}
          i18n={{
            likeNamespace: 'topics.repertoire_move',
            replyNamespace: 'topics.repertoire_move.replies',
            deleteNamespace: 'topics.repertoire_move.deletePost',
          }}
        />
      )}
    </section>
  );
}
