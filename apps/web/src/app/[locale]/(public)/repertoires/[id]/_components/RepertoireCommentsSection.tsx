import { getTranslations } from 'next-intl/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { CommentTreeLoadMore } from '@/app/[locale]/(public)/topics/_components/CommentTreeLoadMore';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import {
  COMMENT_TREE_PAGE_SIZE,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getCommentTreePageForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { loadMoreRepertoireComments } from '../_actions/loadMoreRepertoireComments';
import { NewPostForm } from './NewPostForm';
import { RepertoireCommentTreeBatch } from './RepertoireCommentTreeBatch';

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
 *
 * Comments load incrementally (issue #81): the first batch is SSR'd through
 * `RepertoireCommentTreeBatch`, further batches stream in through the
 * `loadMoreRepertoireComments` Server Action via `CommentTreeLoadMore`.
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
  const { posts, hasMore } = await getCommentTreePageForTopic(
    'repertoire',
    repertoireId,
    { sortBy, offset: 0, limit: COMMENT_TREE_PAGE_SIZE },
    currentUserId
  );
  const attachments =
    posts.length > 0 ? await getAttachmentsForPosts(posts.map((p) => p.id)) : new Map();

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

      {posts.length > 0 && (
        <>
          <SortSelect
            basePath={`/repertoires/${repertoireId}`}
            translationKey="topics.repertoire.sort"
            currentSort={sortBy}
          />
          <CommentTreeLoadMore
            resetKey={sortBy}
            initialHasMore={hasMore}
            initialOffset={COMMENT_TREE_PAGE_SIZE}
            loadMoreAction={loadMoreRepertoireComments.bind(null, repertoireId, locale, sortBy)}
            labels={{
              showMore: tTopics('loadMoreComments.showMore'),
              loading: tTopics('loadMoreComments.loading'),
              retry: tTopics('loadMoreComments.retry'),
              error: tTopics('loadMoreComments.error'),
            }}
          >
            <RepertoireCommentTreeBatch
              locale={locale}
              repertoireId={repertoireId}
              userId={currentUserId}
              comments={posts}
              attachments={attachments}
              sortBy={sortBy}
            />
          </CommentTreeLoadMore>
        </>
      )}
    </>
  );
}
