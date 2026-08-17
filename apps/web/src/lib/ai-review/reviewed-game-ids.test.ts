import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: { selectDistinct: vi.fn() },
  gameAiReviews: {
    id: 'game_ai_reviews.id',
    gameId: 'game_ai_reviews.game_id',
    locale: 'game_ai_reviews.locale',
    createdAt: 'game_ai_reviews.created_at',
  },
}));

const { getReviewedGameIdSet } = await import('./queries');

const mockDb = vi.mocked(db) as unknown as { selectDistinct: ReturnType<typeof vi.fn> };

/** Drizzle-style chain that resolves to `rows` when awaited. */
function mockChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => Promise.resolve(rows)),
  };
  return chain;
}

describe('getReviewedGameIdSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports the games that have a review', async () => {
    mockDb.selectDistinct.mockReturnValue(mockChain([{ gameId: 'game-a' }, { gameId: 'game-c' }]));

    const reviewed = await getReviewedGameIdSet(['game-a', 'game-b', 'game-c']);

    expect([...reviewed].sort()).toEqual(['game-a', 'game-c']);
  });

  // A list page with nothing on it must not pay for a round-trip whose result
  // is already known.
  it('answers an empty request without querying', async () => {
    const reviewed = await getReviewedGameIdSet([]);

    expect(reviewed.size).toBe(0);
    expect(mockDb.selectDistinct).not.toHaveBeenCalled();
  });

  it('resolves the whole page in one query', async () => {
    mockDb.selectDistinct.mockReturnValue(mockChain([]));

    await getReviewedGameIdSet(['game-a', 'game-b', 'game-c']);

    expect(mockDb.selectDistinct).toHaveBeenCalledTimes(1);
  });
});
