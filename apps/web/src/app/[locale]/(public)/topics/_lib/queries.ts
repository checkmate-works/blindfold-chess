import { cache } from 'react';

import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { SOCIAL_AUTHOR_COLUMNS, db, liveProfileJoinOn, profiles, topicPosts } from '@/lib/db';
import { countRows } from '@/lib/db/list-query';
import { UUID_RE } from '@/lib/validations/uuid';

import { sortRoots } from './comment-tree';
import type { TopicType } from './constants';
import { liveTopLevelPosts } from './post-filters';
import { attachPostMeta } from './post-meta';
import { sortPosts } from './shared';
import type { PostWithReplyMeta, SortMode, TopicPostWithAuthor } from './shared';

/**
 * The `topic_posts` + author SELECT every read in this module starts from.
 *
 * LEFT JOIN via `liveProfileJoinOn` so a post whose author deleted their
 * account still surfaces, with a null author. Chain `.where()` / `.orderBy()`
 * / `.limit()` on the result as usual.
 */
function selectPostsWithAuthor() {
  return db
    .select({
      post: topicPosts,
      author: SOCIAL_AUTHOR_COLUMNS,
    })
    .from(topicPosts)
    .leftJoin(profiles, liveProfileJoinOn(topicPosts.userId));
}

type PostAuthorJoinRow = {
  post: typeof topicPosts.$inferSelect;
  author: TopicPostWithAuthor['author'];
};

/** Flatten the `{ post, author }` join rows into the domain shape. */
function toPostsWithAuthor(rows: PostAuthorJoinRow[]): TopicPostWithAuthor[] {
  return rows.map((r) => ({
    ...r.post,
    author: r.author,
  }));
}

/**
 * Get the count of top-level posts for a specific topic type ('square' or 'opening').
 */
export async function getPostCountByTopicType(topicType: TopicType): Promise<number> {
  return countRows(topicPosts, liveTopLevelPosts(topicType));
}

/**
 * Get top-level posts for a specific topicType + topicKey, with author info.
 * Base function shared by squares and openings.
 */
async function getTopLevelPostsByTopicKey(
  topicType: TopicType,
  topicKey: string
): Promise<TopicPostWithAuthor[]> {
  const results = await selectPostsWithAuthor()
    .where(liveTopLevelPosts(topicType, eq(topicPosts.topicKey, topicKey)))
    .orderBy(desc(topicPosts.createdAt));

  return toPostsWithAuthor(results);
}

/**
 * Get a single post by ID, verifying it belongs to the given topicType + topicKey.
 * Base function shared by squares and openings.
 *
 * Wrapped with `React.cache` so the post-detail metadata generator and
 * page component dedupe to a single lookup per request, both for squares
 * (via `getPostById`) and chunks (called directly).
 */
export const getPostByIdAndTopicKey = cache(
  async (
    postId: string,
    topicType: TopicType,
    topicKey: string
  ): Promise<TopicPostWithAuthor | null> => {
    // URL-supplied postId — reject non-UUID input before it reaches Postgres,
    // where `eq(topicPosts.id, "1")` would throw `invalid input syntax for type uuid`
    // and surface as a 500. Caller treats null as 404.
    if (!UUID_RE.test(postId)) {
      return null;
    }

    const results = await selectPostsWithAuthor()
      .where(
        and(
          eq(topicPosts.id, postId),
          eq(topicPosts.topicType, topicType),
          eq(topicPosts.topicKey, topicKey),
          isNull(topicPosts.deletedAt)
        )
      )
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return {
      ...results[0].post,
      author: results[0].author,
    };
  }
);

/**
 * Get top-level posts for a specific topicType + topicKey with reply metadata, sorted.
 * Base function shared by squares and openings.
 */
export async function getPostsWithReplyMetaByTopicKey(
  topicType: TopicType,
  topicKey: string,
  currentUserId?: string,
  sortBy: SortMode = 'new'
): Promise<PostWithReplyMeta[]> {
  const posts = await getTopLevelPostsByTopicKey(topicType, topicKey);
  const postsWithMeta = await attachPostMeta(posts, currentUserId);

  return sortPosts(postsWithMeta, sortBy);
}

/**
 * Get the count of top-level posts for a specific topicType + topicKey.
 */
export async function getPostCountByTopicKey(
  topicType: TopicType,
  topicKey: string
): Promise<number> {
  return countRows(topicPosts, liveTopLevelPosts(topicType, eq(topicPosts.topicKey, topicKey)));
}

/**
 * Get paginated top-level posts for a specific topicType + topicKey with reply metadata, sorted.
 * Uses SQL-level LIMIT/OFFSET for 'new' sort (the DB default ordering), then attaches meta
 * only for the paginated slice. For 'popular' and 'active' sorts, we must fetch all posts
 * since sorting depends on metadata (like counts, reply timestamps).
 */
export async function getPostsWithReplyMetaPaginatedByTopicKey(
  topicType: TopicType,
  topicKey: string,
  limit: number,
  offset: number,
  currentUserId?: string,
  sortBy: SortMode = 'new'
): Promise<PostWithReplyMeta[]> {
  if (sortBy !== 'new') {
    // For 'popular' and 'active' sorts, we need metadata to sort, so fetch all and slice
    const allPosts = await getPostsWithReplyMetaByTopicKey(
      topicType,
      topicKey,
      currentUserId,
      sortBy
    );
    return allPosts.slice(offset, offset + limit);
  }

  // For 'new' sort, use SQL-level pagination (posts already ordered by createdAt DESC)
  const results = await selectPostsWithAuthor()
    .where(liveTopLevelPosts(topicType, eq(topicPosts.topicKey, topicKey)))
    .orderBy(desc(topicPosts.createdAt))
    .limit(limit)
    .offset(offset);

  const posts = toPostsWithAuthor(results);

  return attachPostMeta(posts, currentUserId);
}

/**
 * Get top-level posts for a specific topic type with reply metadata, paginated.
 * Base function shared by squares and openings (for simple cases without extra JOINs).
 */
export async function getPostsByTopicTypePaginated(
  topicType: TopicType,
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await selectPostsWithAuthor()
    .where(liveTopLevelPosts(topicType))
    .orderBy(desc(topicPosts.createdAt))
    .limit(limit)
    .offset(offset);

  const posts = toPostsWithAuthor(results);

  return attachPostMeta(posts, currentUserId);
}

/**
 * Get every comment row (top-level posts AND replies) for a given topic in a
 * single query, with author info and like / reply metadata attached.
 *
 * Used by Reddit-style inline tree views (currently `position_memory` and
 * `position_puzzle` parent pages). The caller passes the result to
 * `buildCommentTree` to materialize the parent-child structure on the server.
 *
 * Sort order: `createdAt ASC` so that when the tree is built, sibling
 * replies under the same parent end up in chronological order. Top-level
 * sort (new / popular / active) is applied AFTER tree building, by the
 * caller.
 *
 * Soft-deleted posts ARE included so `buildCommentTree` can keep deleted
 * nodes that still have live descendants and render them as Reddit-style
 * `[deleted]` tombstones. Without them, every reply under a deleted parent
 * would orphan and silently disappear from the thread. `attachPostMeta`'s
 * reply / replier batch queries already filter out deleted rows, so the
 * tombstones do not contribute to reply counts or replier avatar strips.
 */
export async function getCommentTreeForTopic(
  topicType: TopicType,
  topicKey: string,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await selectPostsWithAuthor()
    .where(and(eq(topicPosts.topicType, topicType), eq(topicPosts.topicKey, topicKey)))
    .orderBy(asc(topicPosts.createdAt));

  const posts = toPostsWithAuthor(results);

  return attachPostMeta(posts, currentUserId);
}

/** One batch of an incrementally loaded comment tree. */
export type CommentTreePage = {
  /**
   * Flat rows for the batch — the page's top-level roots plus EVERY
   * descendant of those roots — ready to hand to `buildCommentTree`.
   * Ordered `createdAt ASC` so sibling replies stay chronological.
   */
  posts: PostWithReplyMeta[];
  /** Whether another batch exists after this one. */
  hasMore: boolean;
};

/**
 * A top-level root belongs in the tree when it is live, OR when it is
 * soft-deleted but still anchors at least one live reply — those roots
 * render as "[deleted]" tombstones (see `buildCommentTree`'s pruning).
 * The paginated query must apply the same rule in SQL, otherwise batch
 * boundaries would shift relative to what the tree actually renders.
 */
const liveOrTombstoneRootFilter = (topicType: TopicType, topicKey: string) =>
  and(
    eq(topicPosts.topicType, topicType),
    eq(topicPosts.topicKey, topicKey),
    isNull(topicPosts.parentId),
    or(
      isNull(topicPosts.deletedAt),
      sql`EXISTS (
        SELECT 1 FROM topic_posts descendant
        WHERE descendant.root_post_id = ${topicPosts.id}
          AND descendant.deleted_at IS NULL
      )`
    )
  );

/**
 * One batch of `getCommentTreeForTopic` — the incremental-loading variant.
 *
 * Pagination is over TOP-LEVEL roots only; each root in the page arrives
 * with its full descendant tree (Reddit-style: a thread is never split
 * across batches). Mirrors the `getPostsWithReplyMetaPaginatedByTopicKey`
 * precedent for sort handling:
 *
 * - `'new'` (the default): root ids are paginated in SQL
 *   (`createdAt DESC, id DESC`) so nothing beyond the page is fetched.
 * - `'popular'` / `'active'`: sorting needs like counts / reply
 *   timestamps, so all roots are fetched with meta, sorted with the SAME
 *   comparator the tree renderer uses (`sortRoots`), then sliced.
 *
 * Offset-based by design (comments are low-churn): a concurrent insert can
 * shift offsets between batches, at worst duplicating a root across two
 * client-appended batches until the next full render. Accepted trade-off —
 * a cursor cannot express the 'popular'/'active' orders anyway, and the
 * duplicate rate is bounded by insert traffic during a single reading
 * session.
 */
export async function getCommentTreePageForTopic(
  topicType: TopicType,
  topicKey: string,
  { sortBy, offset, limit }: { sortBy: SortMode; offset: number; limit: number },
  currentUserId?: string
): Promise<CommentTreePage> {
  const rootFilter = liveOrTombstoneRootFilter(topicType, topicKey);

  let pageRootIds: string[];
  let hasMore: boolean;

  if (sortBy === 'new') {
    // `sortRoots`' 'new' comparator is createdAt DESC; the id tiebreak only
    // stabilizes SQL pagination for equal timestamps.
    const rows = await db
      .select({ id: topicPosts.id })
      .from(topicPosts)
      .where(rootFilter)
      .orderBy(desc(topicPosts.createdAt), desc(topicPosts.id))
      .limit(limit + 1)
      .offset(offset);

    hasMore = rows.length > limit;
    pageRootIds = rows.slice(0, limit).map((r) => r.id);
  } else {
    const rootRows = await selectPostsWithAuthor().where(rootFilter);

    const rootsWithMeta = await attachPostMeta(toPostsWithAuthor(rootRows), currentUserId);
    const sorted = sortRoots(rootsWithMeta, sortBy);

    hasMore = sorted.length > offset + limit;
    pageRootIds = sorted.slice(offset, offset + limit).map((r) => r.id);
  }

  if (pageRootIds.length === 0) {
    return { posts: [], hasMore };
  }

  // Fetch the page roots AND all their descendants in one pass so a single
  // `attachPostMeta` round covers the whole batch.
  const results = await selectPostsWithAuthor()
    .where(
      and(
        eq(topicPosts.topicType, topicType),
        eq(topicPosts.topicKey, topicKey),
        or(inArray(topicPosts.id, pageRootIds), inArray(topicPosts.rootPostId, pageRootIds))
      )
    )
    .orderBy(asc(topicPosts.createdAt));

  const posts = toPostsWithAuthor(results);

  return { posts: await attachPostMeta(posts, currentUserId), hasMore };
}

/**
 * Get replies for a specific post with like metadata.
 * Topic-generic: works on any postId regardless of topicType.
 *
 * Soft-deleted replies ARE included for the same reason as
 * `getCommentTreeForTopic` — `buildCommentTree` keeps deleted-with-replies
 * nodes as tombstones so descendants stay anchored to their thread.
 */
export async function getRepliesByPostId(
  postId: string,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await selectPostsWithAuthor()
    .where(eq(topicPosts.rootPostId, postId))
    .orderBy(asc(topicPosts.createdAt));

  const posts = toPostsWithAuthor(results);

  return attachPostMeta(posts, currentUserId);
}
