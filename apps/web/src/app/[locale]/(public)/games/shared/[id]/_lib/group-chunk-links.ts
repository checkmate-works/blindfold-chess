import type { GameChunkItem } from '@/lib/db/game-chunks';

/**
 * Collapse a ply's chunk links into runs of consecutive links by the same
 * suggester, so one person adding several chunks at once reads as a single
 * comment-style card instead of one card per link. Order is preserved (the
 * input is already oldest-first), so a third party linking between two of a
 * user's links still splits the run — the timeline stays honest.
 */
export function groupChunkLinksBySuggester(items: GameChunkItem[]): GameChunkItem[][] {
  const groups: GameChunkItem[][] = [];
  for (const item of items) {
    const current = groups[groups.length - 1];
    if (current && current[0].suggestedById === item.suggestedById) {
      current.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups;
}
