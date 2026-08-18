import {
  type FlatReply as GenericFlatReply,
  type ReplyGroup as GenericReplyGroup,
  countDescendants,
  flattenReplies,
  groupReplies,
  pruneDeleted,
} from '@/lib/comment-tree/shape';
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

export type FlatReply = GenericFlatReply<GameCommentTreeNode>;
export type ReplyGroup = GenericReplyGroup<GameCommentTreeNode>;

export { countDescendants, flattenReplies, groupReplies };
