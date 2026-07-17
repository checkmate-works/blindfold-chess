import { getTranslations } from 'next-intl/server';

import { CommentTreeLoadMore } from '@/app/[locale]/(public)/topics/_components/CommentTreeLoadMore';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { COMMENT_TREE_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import type { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import type { Locale } from '@/app/[locale]/_lib/types';

import { loadMoreChunkComments } from '../_actions/loadMoreChunkComments';
import type { ChunkDetailData } from '../_lib/load-chunk-detail';
import { ChunkCommentTreeBatch } from './ChunkCommentTreeBatch';
import { NewPostForm } from './NewPostForm';

/**
 * The Comments tab panel of the chunk detail page: the new-post affordance
 * (inline form for the signed-in first commenter, "Join the conversation"
 * toggle otherwise), the sort control, and the incrementally loaded
 * threaded comment tree (issue #81) — the first batch is SSR'd through
 * `ChunkCommentTreeBatch`, further batches stream in through the
 * `loadMoreChunkComments` Server Action via `CommentTreeLoadMore`.
 */
export async function ChunkCommentsTab({
  locale,
  slug,
  userId,
  commentCount,
  comments,
  hasMoreComments,
  attachments,
  sortBy,
  representativeFen,
}: {
  locale: Locale;
  slug: string;
  userId: string | undefined;
  commentCount: number;
  /** First comment-tree batch (page roots + their reply trees). */
  comments: ChunkDetailData['comments'];
  /** Whether batches exist beyond the SSR'd first one. */
  hasMoreComments: boolean;
  attachments: ChunkDetailData['attachments'];
  sortBy: ReturnType<typeof validateSort>;
  /**
   * The chunk's position. Threaded into CommentTree so a legal SAN run in a
   * comment (e.g. "Bxa7 b6") is rendered as a clickable board-preview link —
   * the chunk has one position, so every comment branches from this FEN.
   */
  representativeFen: string;
}) {
  const tTopics = await getTranslations({ locale, namespace: 'topics' });

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

      {comments.length > 0 && (
        <>
          <SortSelect
            basePath={`/chunks/${slug}`}
            translationKey="topics.chunks.sort"
            currentSort={sortBy}
          />
          <CommentTreeLoadMore
            resetKey={sortBy}
            initialHasMore={hasMoreComments}
            initialOffset={COMMENT_TREE_PAGE_SIZE}
            loadMoreAction={loadMoreChunkComments.bind(null, slug, locale, sortBy)}
            labels={{
              showMore: tTopics('loadMoreComments.showMore'),
              loading: tTopics('loadMoreComments.loading'),
              retry: tTopics('loadMoreComments.retry'),
              error: tTopics('loadMoreComments.error'),
            }}
          >
            <ChunkCommentTreeBatch
              locale={locale}
              slug={slug}
              userId={userId}
              comments={comments}
              attachments={attachments}
              sortBy={sortBy}
              representativeFen={representativeFen}
            />
          </CommentTreeLoadMore>
        </>
      )}
    </>
  );
}
