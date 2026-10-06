import { getExpForLevel } from '@blindfold-chess/features/exp';
import { describe, expect, it, vi } from 'vitest';

import { whereThenLimit } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockWhere = vi.fn();

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        where: whereThenLimit(mockWhere),
      }),
    }),
  },
}));

const { getUserLevel } = await import('./get-user-level');

describe('getUserLevel', () => {
  it('derives the level from the user_exp running total', async () => {
    mockWhere.mockReturnValue([{ totalExp: getExpForLevel(5) }]);

    await expect(getUserLevel('user-1')).resolves.toBe(5);
  });

  it('is Lv0 for a user with no user_exp row', async () => {
    mockWhere.mockReturnValue([]);

    await expect(getUserLevel('user-1')).resolves.toBe(0);
  });
});
