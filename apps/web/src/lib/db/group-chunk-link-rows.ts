export type ChunkLinkRow = { gameId: string; ply: number };

export type ChunkLinkedGamePlies = { gameId: string; plies: number[] };

/**
 * Collapse a chunk's link rows into one entry per game.
 *
 * `rows` must already be newest-link first: a game takes the position of its
 * newest link, so the most recently tagged games lead. `limit` counts games,
 * not rows — one game can link the same chunk at several moves. Each game's
 * moves come back ascending with duplicates removed.
 */
export function groupChunkLinkRowsByGame(
  rows: readonly ChunkLinkRow[],
  limit: number
): ChunkLinkedGamePlies[] {
  const pliesByGame = new Map<string, Set<number>>();
  for (const { gameId, ply } of rows) {
    const plies = pliesByGame.get(gameId) ?? new Set<number>();
    plies.add(ply);
    pliesByGame.set(gameId, plies);
  }
  // A Map iterates in first-insertion order, which is newest-link order here.
  return [...pliesByGame]
    .slice(0, limit)
    .map(([gameId, plies]) => ({ gameId, plies: [...plies].sort((a, b) => a - b) }));
}
