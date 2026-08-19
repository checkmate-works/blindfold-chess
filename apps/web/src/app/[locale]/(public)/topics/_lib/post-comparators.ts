/**
 * The comparators behind the `popular` / `active` / `new` sort modes for
 * topic posts.
 *
 * A leaf module by design: it names only the fields it compares, so nothing
 * here reaches `@/lib/db`. That is what kept the rules duplicated — `./shared`
 * value-imports Drizzle column refs (which boot a Postgres client) and so
 * cannot be pulled into the client bundle that renders the comment tree, so
 * `./comment-tree` carried its own copy. Two comparators for one sort order is
 * a live hazard for `getCommentTreePageForTopic`, which slices a globally
 * sorted root list and would drop or duplicate roots across batch boundaries
 * if its comparator ever disagreed with the rendered tree's.
 */
type SortablePost = {
  createdAt: Date | string;
  likeMeta: { likeCount: number };
  replyMeta: { latestReplyAt: Date | string | null };
};

function time(value: Date | string): number {
  return new Date(value).getTime();
}

/** Newest first. Also the tie-break for both other modes. */
export function byNewest(a: SortablePost, b: SortablePost): number {
  return time(b.createdAt) - time(a.createdAt);
}

/** Most liked first, then newest. */
export function byPopularity(a: SortablePost, b: SortablePost): number {
  const likeDiff = b.likeMeta.likeCount - a.likeMeta.likeCount;
  return likeDiff !== 0 ? likeDiff : byNewest(a, b);
}

/**
 * Most recently replied to first, then newest. A post with no replies sorts
 * as if its latest reply were the epoch, so it falls below every post that
 * has one.
 */
export function byActivity(a: SortablePost, b: SortablePost): number {
  const aLatest = a.replyMeta.latestReplyAt ? time(a.replyMeta.latestReplyAt) : 0;
  const bLatest = b.replyMeta.latestReplyAt ? time(b.replyMeta.latestReplyAt) : 0;
  const replyDiff = bLatest - aLatest;
  return replyDiff !== 0 ? replyDiff : byNewest(a, b);
}
