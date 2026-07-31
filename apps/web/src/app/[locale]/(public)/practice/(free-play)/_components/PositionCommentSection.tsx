import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import type { CommentThreadWiring } from '@/app/[locale]/(public)/topics/_components/CommentTreeBatch';
import { CommentTreeBatch } from '@/app/[locale]/(public)/topics/_components/CommentTreeBatch';
import { CommentTreeLoadMore } from '@/app/[locale]/(public)/topics/_components/CommentTreeLoadMore';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import type { LoadMoreCommentsAction } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import { COMMENT_TREE_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  currentUserId: string | undefined;
  /** Everything the page already loaded through `loadPositionDetail`. */
  detail: {
    commentCount: number;
    comments: React.ComponentProps<typeof CommentTreeBatch>['comments'];
    hasMoreComments: boolean;
    attachments: React.ComponentProps<typeof CommentTreeBatch>['attachments'];
  };
  sortBy: React.ComponentProps<typeof CommentTreeBatch>['sortBy'];
  /** Detail-page path the sort links point back at, e.g. `/practice/puzzle/<id>`. */
  basePath: string;
  /** Message key prefix for the sort control, e.g. `topics.positionPuzzle.sort`. */
  sortTranslationKey: string;
  /** i18n namespace holding this feature's `commentsTitle`. */
  commentsNamespace: string;
  loadMoreAction: LoadMoreCommentsAction;
  thread: CommentThreadWiring;
  /**
   * The feature's own comment composer. Rendered either bare (for a signed-in
   * reader arriving at an empty thread) or behind the join toggle, so it is
   * passed as an element rather than built here.
   */
  newPostForm: ReactNode;
};

/**
 * The comment thread under a position-memory or puzzle detail page: title,
 * composer, sort control, and the first batch wrapped in its load-more shell.
 *
 * Both detail pages render this identically; what differs is which actions
 * the thread is wired to and which message namespace names it, both passed
 * in. Keeping one copy matters because the pieces have to agree — the sort
 * mode is threaded through `SortSelect`, `CommentTreeLoadMore`'s reset key,
 * the bound load-more action and the batch itself, and a mismatch shows up
 * only as comments quietly reappearing in the wrong order.
 */
export async function PositionCommentSection({
  locale,
  currentUserId,
  detail,
  sortBy,
  basePath,
  sortTranslationKey,
  commentsNamespace,
  loadMoreAction,
  thread,
  newPostForm,
}: Props) {
  const tComments = await getTranslations({ locale, namespace: commentsNamespace });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });

  const { commentCount, comments, hasMoreComments, attachments } = detail;

  return (
    <>
      <SectionTitle id="comments">{tComments('commentsTitle')}</SectionTitle>

      {currentUserId && commentCount === 0 ? (
        newPostForm
      ) : (
        <JoinConversationToggle count={commentCount} joinLabel={tTopics('joinConversation')}>
          {newPostForm}
        </JoinConversationToggle>
      )}

      {comments.length > 0 && (
        <>
          <SortSelect
            basePath={basePath}
            translationKey={sortTranslationKey}
            currentSort={sortBy}
          />
          <CommentTreeLoadMore
            resetKey={sortBy}
            initialHasMore={hasMoreComments}
            initialOffset={COMMENT_TREE_PAGE_SIZE}
            loadMoreAction={loadMoreAction}
            labels={{
              showMore: tTopics('loadMoreComments.showMore'),
              loading: tTopics('loadMoreComments.loading'),
              retry: tTopics('loadMoreComments.retry'),
              error: tTopics('loadMoreComments.error'),
            }}
          >
            <CommentTreeBatch
              {...thread}
              locale={locale}
              userId={currentUserId}
              comments={comments}
              attachments={attachments}
              sortBy={sortBy}
            />
          </CommentTreeLoadMore>
        </>
      )}
    </>
  );
}
