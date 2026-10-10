import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticateAndCheckBan as mockAuthenticateAndCheckBan } from '@/lib/__mocks__/auth';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const { mockConsumeMaiaGamePoint, mockIsMaiaFreeForUser } = vi.hoisted(() => ({
  mockConsumeMaiaGamePoint: vi.fn(),
  mockIsMaiaFreeForUser: vi.fn(),
}));

vi.mock('@/lib/auth');

vi.mock('@/lib/points', () => ({
  consumeMaiaGamePoint: mockConsumeMaiaGamePoint,
}));

vi.mock('@/lib/users/can-use-maia', () => ({
  isMaiaFreeForUser: mockIsMaiaFreeForUser,
}));

vi.mock('@/lib/security/rate-limit');

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {},
}));

const { startMaiaGame } = await import('./startMaiaGame');

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const GAME_ID = '0f4a1c2e-7b3d-4e8f-9a1b-2c3d4e5f6a7b';

describe('startMaiaGame', () => {
  beforeEach(() => {
    mockAuthenticateAndCheckBan.mockReset();
    mockConsumeMaiaGamePoint.mockReset();
    mockIsMaiaFreeForUser.mockReset();
    mockAuthenticateAndCheckBan.mockResolvedValue({ user: { id: USER_ID } });
  });

  it('rejects a non-UUID game id before touching auth', async () => {
    await expect(startMaiaGame('not-a-uuid', { allowCharge: true })).resolves.toEqual({
      error: 'invalid',
    });
    expect(mockAuthenticateAndCheckBan).not.toHaveBeenCalled();
  });

  it('requires sign-in', async () => {
    mockAuthenticateAndCheckBan.mockResolvedValue({ error: 'signInRequired' });

    await expect(startMaiaGame(GAME_ID, { allowCharge: true })).resolves.toEqual({
      error: 'signInRequired',
    });
    expect(mockConsumeMaiaGamePoint).not.toHaveBeenCalled();
  });

  it('starts a free game without charging when the player is at the free level', async () => {
    mockIsMaiaFreeForUser.mockResolvedValue(true);

    await expect(startMaiaGame(GAME_ID, { allowCharge: false })).resolves.toEqual({
      success: true,
      billing: 'free',
    });
    expect(mockConsumeMaiaGamePoint).not.toHaveBeenCalled();
  });

  it('does not charge when the form did not ask the player about the coin', async () => {
    mockIsMaiaFreeForUser.mockResolvedValue(false);

    await expect(startMaiaGame(GAME_ID, { allowCharge: false })).resolves.toEqual({
      error: 'chargeRequired',
    });
    expect(mockConsumeMaiaGamePoint).not.toHaveBeenCalled();
  });

  it('charges one coin below the free level once the charge is acknowledged', async () => {
    mockIsMaiaFreeForUser.mockResolvedValue(false);
    mockConsumeMaiaGamePoint.mockResolvedValue({ ok: true, alreadyCharged: false });

    await expect(startMaiaGame(GAME_ID, { allowCharge: true })).resolves.toEqual({
      success: true,
      billing: 'charged',
    });
    expect(mockConsumeMaiaGamePoint).toHaveBeenCalledWith(USER_ID, GAME_ID);
  });

  it('reports a retried charge as alreadyCharged', async () => {
    mockIsMaiaFreeForUser.mockResolvedValue(false);
    mockConsumeMaiaGamePoint.mockResolvedValue({ ok: true, alreadyCharged: true });

    await expect(startMaiaGame(GAME_ID, { allowCharge: true })).resolves.toEqual({
      success: true,
      billing: 'alreadyCharged',
    });
  });

  it('surfaces an insufficient balance', async () => {
    mockIsMaiaFreeForUser.mockResolvedValue(false);
    mockConsumeMaiaGamePoint.mockResolvedValue({ ok: false, error: 'insufficient_balance' });

    await expect(startMaiaGame(GAME_ID, { allowCharge: true })).resolves.toEqual({
      error: 'insufficient_balance',
    });
  });
});
