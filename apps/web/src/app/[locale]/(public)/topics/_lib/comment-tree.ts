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
 */
function sortRoots<T extends PostWithReplyMeta>(roots: T[], sortBy: SortMode): T[] {
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

  return sortRoots(roots, topLevelSort);
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

function displayNameOf(node: CommentTreeNode): string {
  return node.author?.displayName || node.author?.username || 'Anonymous';
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
