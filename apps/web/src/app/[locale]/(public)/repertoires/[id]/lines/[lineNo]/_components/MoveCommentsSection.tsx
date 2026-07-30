import { getTranslations } from 'next-intl/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { CommentTreeBatch } from '@/app/[locale]/(public)/topics/_components/CommentTreeBatch';
import { CommentTreeLoadMore } from '@/app/[locale]/(public)/topics/_components/CommentTreeLoadMore';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import { COMMENT_TREE_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getCommentTreePageForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { loadMoreMoveComments } from '../_actions/loadMoreMoveComments';
import { moveCommentThread } from '../_lib/comment-thread';
import { NewMovePostForm } from './NewMovePostForm';

type Props = {
  locale: Locale;
  repertoireId: string;
  lineNo: number;
  /** 1-based half-move in focus — for the compose redirect / list link only. */
  ply: number;
  /** Position-based thread key (`${repertoireId}_${positionHash}`). */
  topicKey: string;
  /**
   * The line's own moves + root, so a comment can reference moves by number
   * ("1... e4", "3. Nf3 Nc6") and have them open a board preview — the same
   * treatment game comments get. Numbers resolve against THIS line's numbering.
   */
  moveNotationLine: MoveNotationLine;
  currentUserId?: string;
};

/**
 * The comment thread for a single move, keyed to topicType 'repertoire_move'
 * (position-based topicKey — see the prop TSDoc). Reuses the shared
 * topic_posts infrastructure — identical to the repertoire / puzzle threads —
 * so per-move discussion gets replies, likes, edits, deletes and attachments
 * for free. Anonymous visitors read; composing requires sign-in.
 *
 * Server-rendered from the focused move (the `?move` param the line viewer
 * keeps in sync), so a post/edit/delete redirect lands back here and the new
 * state shows immediately. Comments are chronological (no sort control yet —
 * per-move volume is low) and load incrementally (issue #81): the first batch
 * is SSR'd through `MoveCommentTreeBatch`, further batches stream in through
 * the `loadMoreMoveComments` Server Action via `CommentTreeLoadMore`.
 */
export async function MoveCommentsSection({
  locale,
  repertoireId,
  lineNo,
  ply,
  topicKey,
  moveNotationLine,
  currentUserId,
}: Props) {
  const tComments = await getTranslations({ locale, namespace: 'topics.repertoire_move' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });

  const commentCount = await getPostCountByTopicKey('repertoire_move', topicKey);
  const { posts, hasMore } = await getCommentTreePageForTopic(
    'repertoire_move',
    topicKey,
    { sortBy: 'new', offset: 0, limit: COMMENT_TREE_PAGE_SIZE },
    currentUserId
  );
  const attachments =
    posts.length > 0 ? await getAttachmentsForPosts(posts.map((p) => p.id)) : new Map();

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

      {posts.length > 0 && (
        <CommentTreeLoadMore
          // No sort control here; the key still remounts the accumulated
          // batches when a soft navigation moves focus to another ply's
          // thread.
          resetKey={topicKey}
          initialHasMore={hasMore}
          initialOffset={COMMENT_TREE_PAGE_SIZE}
          loadMoreAction={loadMoreMoveComments.bind(
            null,
            repertoireId,
            lineNo,
            ply,
            topicKey,
            locale
          )}
          labels={{
            showMore: tTopics('loadMoreComments.showMore'),
            loading: tTopics('loadMoreComments.loading'),
            retry: tTopics('loadMoreComments.retry'),
            error: tTopics('loadMoreComments.error'),
          }}
        >
          <CommentTreeBatch
            {...moveCommentThread({
              locale,
              repertoireId,
              lineNo,
              ply,
              topicKey,
              moveNotationLine,
            })}
            locale={locale}
            userId={currentUserId}
            comments={posts}
            attachments={attachments}
            sortBy="new"
          />
        </CommentTreeLoadMore>
      )}
    </section>
  );
}
