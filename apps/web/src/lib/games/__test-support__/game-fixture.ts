import type { Game } from '@/lib/games/saved-game-types';

/**
 * A saved game with every field a list surface reads already filled in, so a
 * test names only the part it is about.
 *
 * The defaults are arbitrary but fixed — two consecutive January 2024 dates, a
 * white player against Stockfish at its lowest skill, no moves played, still in
 * progress. Fixed rather than generated so a snapshot or an ordering assertion
 * cannot drift with the clock. `id` is required because every list surface keys
 * on it, and two games sharing one is a bug the fixture should not hide.
 */
export function createMockGame(overrides: Partial<Game> & { id: string }): Game {
  return {
    date: new Date('2024-01-01').toISOString(),
    lastPlayed: new Date('2024-01-02').toISOString(),
    moves: [],
    playerColor: 'white',
    engineConfig: { kind: 'stockfish', skillLevel: 1 },
    status: 'in_progress',
    ...overrides,
  };
}

/** `count` distinct games, ids `game-1`… — for tests about list length or paging. */
export function createMockGames(count: number): Game[] {
  return Array.from({ length: count }, (_, i) => createMockGame({ id: `game-${i + 1}` }));
}
