import type { PostWithReplyMeta, SortMode } from './shared';

/**
 * Sort the top-level node array.
 *
 * The logic is intentionally duplicated from `sortPosts` in `./shared`
 * rather than imported: this module is consumed by client components
 * (see `CommentNode`), and `./shared` value-imports from `@/lib/db`
 * (Drizzle column refs that boot a Postgres client) which must not enter
 * the client bundle.
 *
 * Differs from `sortPosts` only in 'new' handling: `sortPosts` treats 'new'
 * as a no-op assuming `createdAt DESC` input; tree path receives
 * `createdAt ASC` (so sibling replies stay chronological), so we re-sort.
 *
 * Exported (beyond `buildCommentTree`'s internal use) for
 * `getCommentTreePageForTopic`, which must slice the globally-sorted root
 * list with the exact comparator the rendered tree uses — if the two ever
 * diverged, batch boundaries would drop or duplicate roots.
 */
export function sortRoots<T extends PostWithReplyMeta>(roots: T[], sortBy: SortMode): T[] {
  if (sortBy === 'popular') {
    return [...roots].sort((a, b) => {
      const likeDiff = b.likeMeta.likeCount - a.likeMeta.likeCount;
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  if (sortBy === 'active') {
    return [...roots].sort((a, b) => {
      const aLatest = a.replyMeta.latestReplyAt ? new Date(a.replyMeta.latestReplyAt).getTime() : 0;
      const bLatest = b.replyMeta.latestReplyAt ? new Date(b.replyMeta.latestReplyAt).getTime() : 0;
      const replyDiff = bLatest - aLatest;
      if (replyDiff !== 0) return replyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  // 'new'
  return [...roots].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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

/**
 * Prune a subtree so that deleted nodes survive only when they have at least
 * one live descendant. Returns 0 or 1 nodes (an array for `flatMap` use).
 *
 * A deleted leaf — or a deleted node whose entire subtree is also deleted —
 * is removed. A deleted node with at least one live descendant somewhere
 * below is kept, with its `children` recursively pruned, so the rendering
 * layer can still place a tombstone in the right structural position.
 */
function pruneDeleted(node: CommentTreeNode): CommentTreeNode[] {
  const prunedChildren = node.children.flatMap(pruneDeleted);
  if (node.deletedAt && prunedChildren.length === 0) {
    return [];
  }
  return [{ ...node, children: prunedChildren }];
}

/**
 * Count every descendant of a tree node (children + their descendants).
 * Used by the collapse affordance to label "N replies hidden".
 */
export function countDescendants(node: CommentTreeNode): number {
  let total = 0;
  for (const child of node.children) {
    total += 1 + countDescendants(child);
  }
  return total;
}

/**
 * A flat reply produced by `flattenReplies`. The `node` is the reply itself;
 * `replyToDisplayName` carries the immediate parent's display name when the
 * parent is NOT the root, so the UI can show "@<parent>" to keep mid-chain
 * replies legible. When the parent IS the root, this is `null` — every flat
 * reply is rendered indented under the root, so an "@<root>" prefix would be
 * redundant noise.
 */
export type FlatReply = {
  node: CommentTreeNode;
  replyToDisplayName: string | null;
};

/**
 * Resolve the display name to attribute "@<parent>" prefixes to. Returns
 * `null` for soft-deleted nodes so the rendering layer suppresses the
 * @-prefix entirely — tombstones must not leak the original author's name
 * via descendants' "in reply to" cues.
 */
function displayNameOf(node: CommentTreeNode): string | null {
  if (node.deletedAt) return null;
  return node.author?.displayName || node.author?.username || null;
}

/**
 * Flatten every descendant of `root` into a single ordered list (DFS pre-order)
 * so the UI can render all replies at one indent level (YouTube-style) instead
 * of recursively nesting them. Each entry carries its immediate parent's
 * display name, but only when the parent is NOT the root — direct replies to
 * the root get `null` because their relationship is already conveyed by being
 * placed under the root.
 *
 * Why DFS pre-order: it keeps a "C replied to B replied to A" chain adjacent
 * in the rendered list, which matches how readers scan a conversation. A pure
 * chronological sort would interleave unrelated chains and make the @-prefix
 * the only way to recover context.
 */
export function flattenReplies(root: CommentTreeNode): FlatReply[] {
  const out: FlatReply[] = [];
  function walk(node: CommentTreeNode, parentIsRoot: boolean) {
    for (const child of node.children) {
      out.push({
        node: child,
        replyToDisplayName: parentIsRoot ? null : displayNameOf(node),
      });
      walk(child, false);
    }
  }
  walk(root, true);
  return out;
}

/**
 * A first-level reply (direct reply to the thread root) plus all of its own
 * descendants flattened into a single list. Used by the three-level layout:
 * root → first-level reply (1 indent) → deeper replies flattened under it
 * (2 indents max). The `deeper` array uses the same shape as `flattenReplies`,
 * with `@<parent>` prefixes set only when the parent is NOT the first-level
 * reply itself.
 */
export type ReplyGroup = {
  first: CommentTreeNode;
  deeper: FlatReply[];
};

/**
 * Group a root's descendant tree by first-level reply.
 *
 * Each entry is `{ first, deeper }` where `first` is a direct reply to the
 * root (rendered with one indent) and `deeper` is everything under `first`
 * flattened DFS-pre-order (rendered with two indents — the maximum). Replies
 * whose immediate parent is `first` itself get `replyToDisplayName: null`
 * (no @-prefix); deeper replies carry their parent's display name so the
 * "in reply to" cue survives the flattening. This is the structural cap:
 * indentation never exceeds two levels regardless of how deep the underlying
 * `parent_id` chain goes.
 */
export function groupReplies(root: CommentTreeNode): ReplyGroup[] {
  return root.children.map((first) => ({
    first,
    deeper: flattenReplies(first),
  }));
}
