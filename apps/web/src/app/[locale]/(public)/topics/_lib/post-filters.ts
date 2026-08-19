import { type SQL, and, eq, inArray, isNull } from 'drizzle-orm';

import { topicPosts } from '@/lib/db';

import type { TopicType } from './constants';

/**
 * Live top-level posts of one or more `topicType`s, narrowed further by any
 * extra conditions the caller supplies.
 *
 * "Top-level" means no parent, "live" means not soft-deleted. Every list read
 * and its matching count have to agree on this predicate exactly — a count that
 * drifts from its list is a pagination bug that only shows up on the last page,
 * where the list runs out of rows before the pager runs out of pages. Nine
 * queries used to spell the two `isNull`s out by hand, including a list/count
 * pair in the same module.
 *
 * `narrowing` is variadic rather than a `topicKey` parameter because callers
 * narrow by different things — one key, a set of keys, an author — and folding
 * those into named options would mean a branch per caller.
 */
export function liveTopLevelPosts(
  topicType: TopicType | readonly TopicType[],
  ...narrowing: (SQL | undefined)[]
) {
  return and(
    Array.isArray(topicType)
      ? inArray(topicPosts.topicType, topicType as TopicType[])
      : eq(topicPosts.topicType, topicType as TopicType),
    ...narrowing,
    isNull(topicPosts.parentId),
    isNull(topicPosts.deletedAt)
  );
}
