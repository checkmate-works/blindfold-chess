import { getTranslations } from 'next-intl/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { attachPostFenFromForm } from '@/app/[locale]/(public)/topics/_actions/attachPostFen';
import { attachPostPgn } from '@/app/[locale]/(public)/topics/_actions/attachPostPgn';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { removePostAttachment } from '@/app/[locale]/(public)/topics/_actions/removePostAttachment';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getCommentTreeForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createReplyWithAttachment } from '../_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from '../_actions/createReplyWithFenAttachment';
import { toggleRepertoirePostLike } from '../_actions/toggleRepertoirePostLike';
import { NewPostForm } from './NewPostForm';

type Props = {
  locale: Locale;
  repertoireId: string;
  /** Raw `?sort` value; validated here so the page stays out of the comment concern. */
  sort?: string;
  currentUserId?: string;
};

/**
 * The repertoire-level comment thread (topicType 'repertoire') — the shared
 * topic_posts UI identical to the puzzle / topics pages. Owns its own fetch and
 * sort handling so the detail page is left to compose the repertoire view.
 * Anonymous visitors read; composing requires sign-in.
 */
export async function RepertoireCommentsSection({
  locale,
  repertoireId,
  sort,
  currentUserId,
}: Props) {
  const tComments = await getTranslations({ locale, namespace: 'topics.repertoire' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });

  const sortBy = validateSort(sort ?? 'new');
  const commentCount = await getPostCountByTopicKey('repertoire', repertoireId);
  const allComments = await getCommentTreeForTopic('repertoire', repertoireId, currentUserId);
  const commentTree = buildCommentTree(allComments, sortBy);
  const allPostIds = allComments.map((c) => c.id);
  const attachments = allPostIds.length > 0 ? await getAttachmentsForPosts(allPostIds) : new Map();

  return (
    <>
      <SectionTitle>{tComments('commentsTitle')}</SectionTitle>

      {currentUserId && commentCount === 0 ? (
        <NewPostForm locale={locale} repertoireId={repertoireId} />
      ) : (
        <JoinConversationToggle count={commentCount} joinLabel={tTopics('joinConversation')}>
          <NewPostForm locale={locale} repertoireId={repertoireId} />
        </JoinConversationToggle>
      )}

      {commentTree.length > 0 && (
        <>
          <SortSelect
            basePath={`/repertoires/${repertoireId}`}
            translationKey="topics.repertoire.sort"
            currentSort={sortBy}
          />
          <CommentTree
            comments={commentTree}
            locale={locale}
            topicKey={repertoireId}
            currentUserId={currentUserId}
            enableSpoiler={false}
            redirectPath={`/${locale}/repertoires/${repertoireId}`}
            toggleLikeAction={toggleRepertoirePostLike}
            replyAttachmentActions={{
              pgn: createReplyWithAttachment,
              fen: createReplyWithFenAttachment,
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
        </>
      )}
    </>
  );
}
