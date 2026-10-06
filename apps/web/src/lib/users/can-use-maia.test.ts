import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAIA_FREE_LEVEL } from './maia-free-level';

const { mockGetUserLevel, mockHasMaiaGameCharge, mockGetPointBalanceSummary } = vi.hoisted(() => ({
  mockGetUserLevel: vi.fn(),
  mockHasMaiaGameCharge: vi.fn(),
  mockGetPointBalanceSummary: vi.fn(),
}));

vi.mock('@/lib/db/get-user-level', () => ({
  getUserLevel: mockGetUserLevel,
}));

vi.mock('@/lib/points', () => ({
  hasMaiaGameCharge: mockHasMaiaGameCharge,
  getPointBalanceSummary: mockGetPointBalanceSummary,
}));

const { canUseMaia, getMaiaEngineAccess, isMaiaFreeForUser } = await import('./can-use-maia');

describe('canUseMaia', () => {
  beforeEach(() => {
    mockGetUserLevel.mockReset();
    mockHasMaiaGameCharge.mockReset();
    mockGetPointBalanceSummary.mockReset();
  });

  it('denies anonymous callers without touching the database', async () => {
    await expect(canUseMaia(null)).resolves.toBe(false);
    expect(mockGetUserLevel).not.toHaveBeenCalled();
    expect(mockHasMaiaGameCharge).not.toHaveBeenCalled();
  });

  it('allows a user at the free level even with no Maia charge on record', async () => {
    mockGetUserLevel.mockResolvedValue(MAIA_FREE_LEVEL);

    await expect(canUseMaia('user-1')).resolves.toBe(true);
    expect(mockHasMaiaGameCharge).not.toHaveBeenCalled();
  });

  it('allows a user below the free level who has paid for a Maia game', async () => {
    mockGetUserLevel.mockResolvedValue(MAIA_FREE_LEVEL - 1);
    mockHasMaiaGameCharge.mockResolvedValue(true);

    await expect(canUseMaia('user-1')).resolves.toBe(true);
  });

  it('denies a user below the free level with no Maia charge', async () => {
    mockGetUserLevel.mockResolvedValue(0);
    mockHasMaiaGameCharge.mockResolvedValue(false);

    await expect(canUseMaia('user-1')).resolves.toBe(false);
  });
});

describe('isMaiaFreeForUser', () => {
  it('reads the level and applies the free-level threshold', async () => {
    mockGetUserLevel.mockResolvedValue(MAIA_FREE_LEVEL);
    await expect(isMaiaFreeForUser('user-1')).resolves.toBe(true);

    mockGetUserLevel.mockResolvedValue(MAIA_FREE_LEVEL - 1);
    await expect(isMaiaFreeForUser('user-1')).resolves.toBe(false);
  });
});

describe('getMaiaEngineAccess', () => {
  it('returns a locked zero state for anonymous viewers', async () => {
    await expect(getMaiaEngineAccess(null)).resolves.toEqual({
      level: 0,
      spendableBalance: 0,
    });
    expect(mockGetPointBalanceSummary).not.toHaveBeenCalled();
  });

  it('returns the level alongside the spendable balance', async () => {
    mockGetUserLevel.mockResolvedValue(7);
    mockGetPointBalanceSummary.mockResolvedValue({ total: 3 });

    await expect(getMaiaEngineAccess('user-1')).resolves.toEqual({
      level: 7,
      spendableBalance: 3,
    });
  });
});
