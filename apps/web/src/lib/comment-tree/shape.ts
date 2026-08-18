/**
 * The reply-tree operations, over any node shape.
 *
 * Topic threads and shared-game advice each grew their own copy of these —
 * `pruneDeleted`, `countDescendants`, `displayNameOf`, `flattenReplies`,
 * `groupReplies`, plus the `FlatReply` and `ReplyGroup` types — with bodies
 * that match statement for statement. What differs between the two is the row
 * type they hang off (`PostWithReplyMeta` vs `GameCommentItem`) and how the
 * roots are ordered, which is why building the tree stays with each caller.
 *
 * The rules encoded here are shared product decisions, not incidental
 * similarity: how deep the indentation goes, when a tombstone survives, and
 * when a reply shows an `@<parent>` cue. A reader comparing the two threads
 * should see the same behaviour, so they should read one implementation.
 *
 * Pure module: safe to import from client components.
 */

/** Anything with children of its own type. */
type HasChildren<N> = { children: N[] };

/** What {@link displayNameOf} needs to attribute an `@<parent>` cue. */
type Attributable = {
  deletedAt: Date | null;
  author?: { displayName?: string | null; username?: string | null } | null;
};

/**
 * Drop soft-deleted nodes that anchor nothing.
 *
 * A tombstone survives only while it still holds a live descendant, so the
 * rendering layer can keep the parent-child structure under it intact. A
 * deleted leaf disappears entirely — a tombstone with no replies is noise.
 */
export function pruneDeleted<N extends HasChildren<N> & { deletedAt: Date | null }>(node: N): N[] {
  const prunedChildren = node.children.flatMap(pruneDeleted);
  if (node.deletedAt && prunedChildren.length === 0) return [];
  return [{ ...node, children: prunedChildren }];
}

/**
 * Count every descendant (children plus theirs). Used by the collapse
 * affordance to label "N replies hidden".
 */
export function countDescendants<N extends HasChildren<N>>(node: N): number {
  let total = 0;
  for (const child of node.children) {
    total += 1 + countDescendants(child);
  }
  return total;
}

/**
 * A flat reply produced by {@link flattenReplies}. `replyToDisplayName`
 * carries the immediate parent's display name when the parent is NOT the
 * root, so the UI can show `@<parent>` and keep mid-chain replies legible.
 * When the parent IS the root it is `null` — every flat reply renders
 * indented under the root, so that prefix would be redundant noise.
 */
export type FlatReply<N> = {
  node: N;
  replyToDisplayName: string | null;
};

/**
 * The display name an `@<parent>` cue is attributed to. `null` for
 * soft-deleted nodes, so a tombstone cannot leak the original author's name
 * through its descendants' "in reply to" cues.
 */
function displayNameOf(node: Attributable): string | null {
  if (node.deletedAt) return null;
  return node.author?.displayName || node.author?.username || null;
}

/**
 * Flatten every descendant of `root` into one ordered list (DFS pre-order) so
 * the UI renders replies at a single indent level instead of nesting them.
 *
 * Why DFS pre-order: it keeps a "C replied to B replied to A" chain adjacent
 * in the rendered list, which matches how a reader scans a conversation. A
 * chronological sort would interleave unrelated chains and leave the
 * `@<parent>` cue as the only way to recover context.
 */
export function flattenReplies<N extends HasChildren<N> & Attributable>(root: N): FlatReply<N>[] {
  const out: FlatReply<N>[] = [];
  function walk(node: N, parentIsRoot: boolean) {
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
 * A first-level reply plus all of its own descendants flattened.
 */
export type ReplyGroup<N> = {
  first: N;
  deeper: FlatReply<N>[];
};

/**
 * Group a root's descendants by first-level reply: `first` is a direct reply
 * (one indent) and `deeper` is everything under it flattened (two indents).
 *
 * This is the structural cap — indentation never exceeds two levels however
 * deep the underlying `parent_id` chain goes.
 */
export function groupReplies<N extends HasChildren<N> & Attributable>(root: N): ReplyGroup<N>[] {
  return root.children.map((first) => ({
    first,
    deeper: flattenReplies(first),
  }));
}
