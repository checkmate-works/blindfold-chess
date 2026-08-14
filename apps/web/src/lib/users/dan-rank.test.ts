import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLimit = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: (...args: unknown[]) => mockLimit(...args),
          }),
        }),
      }),
    }),
  },
  ranks: { id: 'id', level: 'level' },
  userRanks: { id: 'id', userId: 'user_id', rankId: 'rank_id' },
}));

vi.mock('@/lib/db-timeout', () => ({
  withTimeout: (promise: Promise<unknown>) => promise,
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

const { hasDanTierRank } = await import('./dan-rank');

describe('hasDanTierRank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when the user holds a dan-tier rank row', async () => {
    mockLimit.mockResolvedValue([{ id: 'user-rank-1' }]);

    await expect(hasDanTierRank('user-1')).resolves.toBe(true);
  });

  it('returns false when the user holds no dan-tier rank', async () => {
    mockLimit.mockResolvedValue([]);

    await expect(hasDanTierRank('user-2')).resolves.toBe(false);
  });

  it('fails closed (false → ads shown) when the DB query throws', async () => {
    mockLimit.mockRejectedValue(new Error('DB down'));

    await expect(hasDanTierRank('user-3')).resolves.toBe(false);
  });
});
