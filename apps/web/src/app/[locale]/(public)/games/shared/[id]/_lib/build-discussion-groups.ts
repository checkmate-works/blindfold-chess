import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

export type DiscussionGroup = {
  /** The move the group anchors to (0-based ply), or null for whole-game comments. */
  ply: number | null;
  /** Live (non-deleted) comments for this anchor. */
  comments: GameCommentItem[];
  /** Chunk links for this move (always ply-anchored). */
  chunks: GameChunkItem[];
};

/**
 * Roll every comment + chunk link for a game up into one chronological,
 * move-grouped feed for the overview board. Whole-game comments (`ply = null`)
 * lead; the rest follow in move order. Deleted comments are dropped, and an
 * anchor only appears when it has something live to show. The per-move detail
 * view stays the place to act — this is a read-only digest that links into it.
 */
export function buildDiscussionGroups(
  comments: GameCommentItem[],
  chunks: GameChunkItem[]
): DiscussionGroup[] {
  const live = comments.filter((c) => c.deletedAt === null);

  const groups: DiscussionGroup[] = [];

  const wholeGame = live.filter((c) => c.ply === null);
  if (wholeGame.length > 0) {
    groups.push({ ply: null, comments: wholeGame, chunks: [] });
  }

  const plies = new Set<number>();
  for (const c of live) if (c.ply !== null) plies.add(c.ply);
  for (const k of chunks) plies.add(k.ply);

  for (const ply of [...plies].sort((a, b) => a - b)) {
    groups.push({
      ply,
      comments: live.filter((c) => c.ply === ply),
      chunks: chunks.filter((k) => k.ply === ply),
    });
  }

  return groups;
}
