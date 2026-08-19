import { describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: { selectDistinct: vi.fn() },
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
