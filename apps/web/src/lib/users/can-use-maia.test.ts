import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAIA_UNLOCK_LEVEL } from './maia-unlock-level';

const { mockGetUserLevel } = vi.hoisted(() => ({
  mockGetUserLevel: vi.fn(),
}));

vi.mock('@/lib/db/get-user-level', () => ({
  getUserLevel: mockGetUserLevel,
}));

const { canUseMaia, getMaiaEngineAccess } = await import('./can-use-maia');

describe('canUseMaia', () => {
  beforeEach(() => {
    mockGetUserLevel.mockReset();
  });

  it('refuses an anonymous caller without reading a level', async () => {
    await expect(canUseMaia(null)).resolves.toBe(false);
    expect(mockGetUserLevel).not.toHaveBeenCalled();
  });

  it('allows a user at the unlock level', async () => {
    mockGetUserLevel.mockResolvedValue(MAIA_UNLOCK_LEVEL);
    await expect(canUseMaia('user-1')).resolves.toBe(true);
  });

  it('refuses a user below the unlock level', async () => {
    mockGetUserLevel.mockResolvedValue(MAIA_UNLOCK_LEVEL - 1);
    await expect(canUseMaia('user-1')).resolves.toBe(false);
  });
});

describe('getMaiaEngineAccess', () => {
  beforeEach(() => {
    mockGetUserLevel.mockReset();
  });

  it('reports level 0 for an anonymous viewer', async () => {
    await expect(getMaiaEngineAccess(null)).resolves.toEqual({ level: 0 });
    expect(mockGetUserLevel).not.toHaveBeenCalled();
  });

  it("reports a signed-in viewer's level", async () => {
    mockGetUserLevel.mockResolvedValue(3);
    await expect(getMaiaEngineAccess('user-1')).resolves.toEqual({ level: 3 });
  });
});
