import { getFenAfterMoves, getStartingFen } from '@blindfold-chess/features/chess-core';
import { describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

// Pass-through cache wrappers so the real loader/index logic runs in the test.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const fen = (moves: string[]) => getFenAfterMoves(getStartingFen(), moves);

const ROWS = [
  { slug: 'kings-pawn', name: "King's Pawn", ecoCode: 'B00', fen: fen(['e4']) },
  {
    slug: 'ruy-lopez',
    name: 'Ruy Lopez',
    ecoCode: 'C60',
    fen: fen(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']),
  },
  {
    slug: 'ruy-lopez-berlin',
    name: 'Ruy Lopez: Berlin Defense',
    ecoCode: 'C65',
    fen: fen(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6']),
  },
];

// The master is read through `getOpenings`, which selects whole rows; the four
// fields detection projects are all these tests care about.
vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({ from: () => ({ orderBy: () => Promise.resolve(ROWS) }) }),
  },
}));

const { detectGameOpening } = await import('./detect-game-opening');

describe('detectGameOpening', () => {
  it('maps the deepest matched opening to its display record', async () => {
    const result = await detectGameOpening({
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
    });
    expect(result).toEqual({
      slug: 'ruy-lopez-berlin',
      name: 'Ruy Lopez: Berlin Defense',
      ecoCode: 'C65',
    });
  });

  it('returns null for an empty game without touching the master', async () => {
    expect(await detectGameOpening({ moves: [] })).toBeNull();
  });

  it('returns null for a custom starting position', async () => {
    const customFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
    expect(await detectGameOpening({ moves: ['e5'], startingFen: customFen })).toBeNull();
  });

  it('treats a null startingFen as the standard start', async () => {
    const result = await detectGameOpening({ moves: ['e4'], startingFen: null });
    expect(result?.slug).toBe('kings-pawn');
  });
});
