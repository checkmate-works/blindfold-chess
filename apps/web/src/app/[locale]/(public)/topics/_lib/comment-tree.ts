import {
  type FlatReply as GenericFlatReply,
  type ReplyGroup as GenericReplyGroup,
  countDescendants,
  flattenReplies,
  groupReplies,
  pruneDeleted,
} from '@/lib/comment-tree/shape';

import { byActivity, byNewest, byPopularity } from './post-comparators';
import type { PostWithReplyMeta, SortMode } from './shared';

/**
 * Sort the top-level node array.
 *
 * Differs from `sortPosts` in `./shared` only in 'new' handling: `sortPosts`
 * treats 'new' as a no-op assuming `createdAt DESC` input; the tree path
 * receives `createdAt ASC` (so sibling replies stay chronological), so we
 * re-sort. The comparators themselves come from `./post-comparators`, a leaf
 * module this can import without dragging `./shared`'s Drizzle column refs
 * into the client bundle that renders `CommentNode`.
 *
 * Exported (beyond `buildCommentTree`'s internal use) for
 * `getCommentTreePageForTopic`, which must slice the globally-sorted root
 * list with the exact comparator the rendered tree uses — if the two ever
 * diverged, batch boundaries would drop or duplicate roots.
 */
export function sortRoots<T extends PostWithReplyMeta>(roots: T[], sortBy: SortMode): T[] {
  if (sortBy === 'popular') return [...roots].sort(byPopularity);
  if (sortBy === 'active') return [...roots].sort(byActivity);
  // 'new'
  return [...roots].sort(byNewest);
}

/**
 * A single node in a Reddit-style comment tree. The flat post is augmented
 * with a `children` array of further nodes under it (replies), recursively.
 *
 * The shape is intentionally additive — every property of `PostWithReplyMeta`
 * is preserved (including `replyMeta` and `likeMeta`), so any existing
 * component that consumes a flat post can also consume a tree node.
 */
export type CommentTreeNode = PostWithReplyMeta & {
  children: CommentTreeNode[];
};

/**
 * Build a comment tree from a flat list of posts.
 *
 * Top-level posts (no `parentId`) become roots; each non-top-level post is
 * placed under its `parentId`. Roots are sorted by `topLevelSort` (the
 * existing 'new' / 'popular' / 'active' SortMode); children are kept in the
 * order they appeared in the input — callers should pass the flat list
 * sorted `createdAt ASC` so siblings end up oldest-first (forum / Reddit
 * convention for replies).
 *
 * Posts whose `parentId` does not appear in the input (e.g. orphaned because
 * the parent was deleted at the DB level after this list was fetched) are
 * dropped from the tree rather than promoted to roots — this avoids
 * surprising the reader with replies that look like top-level comments.
 *
 * Soft-deleted posts (`deletedAt != null`) survive only when they retain at
 * least one live descendant; otherwise they are pruned. The kept ones are
 * rendered as Reddit-style "[deleted]" tombstones by `CommentNode` so the
 * thread structure (parent-child) under them stays intact, while leaf
 * deletions disappear entirely (a tombstone with no replies is just noise).
 */
export function buildCommentTree(
  flat: PostWithReplyMeta[],
  topLevelSort: SortMode = 'new'
): CommentTreeNode[] {
  const byId = new Map<string, CommentTreeNode>();
  for (const post of flat) {
    byId.set(post.id, { ...post, children: [] });
  }

  const roots: CommentTreeNode[] = [];
  for (const post of flat) {
    const node = byId.get(post.id);
    if (!node) continue;
    if (!post.parentId) {
      roots.push(node);
      continue;
    }
    const parent = byId.get(post.parentId);
    if (parent) {
      parent.children.push(node);
    }
    // else: orphan — silently dropped per the docstring.
  }

  return sortRoots(roots.flatMap(pruneDeleted), topLevelSort);
}

export type FlatReply = GenericFlatReply<CommentTreeNode>;
export type ReplyGroup = GenericReplyGroup<CommentTreeNode>;

export { countDescendants, flattenReplies, groupReplies };
