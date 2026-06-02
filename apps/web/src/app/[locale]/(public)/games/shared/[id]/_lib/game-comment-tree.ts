import type { GameCommentItem } from '@/lib/db/game-comments';

/**
 * Reddit-style comment tree for shared-game advice. Mirrors the topics
 * `comment-tree` helpers (build → prune deleted → group by first-level reply,
 * with a two-indent structural cap), adapted to the flat `GameCommentItem`
 * row. Pure module: safe to import from client components.
 *
 * Roots and sibling replies are kept oldest-first (the input is ordered by the
 * time-sortable UUIDv7 id), which reads as a chronological conversation — the
 * natural order for move-by-move advice.
 */
export type GameCommentTreeNode = GameCommentItem & {
  children: GameCommentTreeNode[];
};

/**
 * Build the tree from a flat list (already filtered to one ply). Top-level
 * comments (`parentId == null`) become roots; replies nest under their parent;
 * orphans (parent absent from the list) are dropped rather than promoted.
 * Soft-deleted nodes survive only when they still anchor a live descendant,
 * so the rendering layer can place a "[deleted]" tombstone without leaving
 * lone tombstones behind.
 */
export function buildGameCommentTree(flat: GameCommentItem[]): GameCommentTreeNode[] {
  const byId = new Map<string, GameCommentTreeNode>();
  for (const c of flat) {
    byId.set(c.id, { ...c, children: [] });
  }

  const roots: GameCommentTreeNode[] = [];
  for (const c of flat) {
    const node = byId.get(c.id);
    if (!node) continue;
    if (!c.parentId) {
      roots.push(node);
      continue;
    }
    byId.get(c.parentId)?.children.push(node);
  }

  return roots.flatMap(pruneDeleted);
}

function pruneDeleted(node: GameCommentTreeNode): GameCommentTreeNode[] {
  const prunedChildren = node.children.flatMap(pruneDeleted);
  if (node.deletedAt && prunedChildren.length === 0) return [];
  return [{ ...node, children: prunedChildren }];
}

/** Count every descendant — used by the collapse "N replies hidden" label. */
export function countDescendants(node: GameCommentTreeNode): number {
  let total = 0;
  for (const child of node.children) {
    total += 1 + countDescendants(child);
  }
  return total;
}

export type FlatReply = {
  node: GameCommentTreeNode;
  replyToDisplayName: string | null;
};

function displayNameOf(node: GameCommentTreeNode): string | null {
  if (node.deletedAt) return null;
  return node.author?.displayName || node.author?.username || 'Anonymous';
}

/**
 * Flatten every descendant of `root` (DFS pre-order) so the UI renders one
 * indent level. Each entry carries its immediate parent's display name, but
 * only when the parent is NOT `root` — direct replies to `root` get `null`
 * because their placement already conveys the relationship.
 */
export function flattenReplies(root: GameCommentTreeNode): FlatReply[] {
  const out: FlatReply[] = [];
  function walk(node: GameCommentTreeNode, parentIsRoot: boolean) {
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

export type ReplyGroup = {
  first: GameCommentTreeNode;
  deeper: FlatReply[];
};

/**
 * Group a root's descendants by first-level reply: `{ first, deeper }` where
 * `first` is a direct reply (one indent) and `deeper` is everything under it
 * flattened (two indents — the cap). Indentation never exceeds two levels
 * regardless of the underlying `parent_id` depth.
 */
export function groupReplies(root: GameCommentTreeNode): ReplyGroup[] {
  return root.children.map((first) => ({
    first,
    deeper: flattenReplies(first),
  }));
}
