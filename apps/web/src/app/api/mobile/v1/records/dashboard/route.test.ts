import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const authorizeMobileRequest = vi.fn();
vi.mock('@/lib/mobile-api/auth', () => ({
  authorizeMobileRequest: (...args: unknown[]) => authorizeMobileRequest(...args),
}));
vi.mock('server-only', () => ({}));

const loadChallengeDashboard = vi.fn();
vi.mock('@/app/[locale]/(protected)/mypage/(confirmed)/challenges/_lib/dashboard-queries', () => ({
  loadChallengeDashboard: (...args: unknown[]) => loadChallengeDashboard(...args),
}));

const RANGES =
  'currentStart=2026-11-23T00:00:00.000Z&currentEnd=2026-11-30T00:00:00.000Z' +
  '&previousStart=2026-11-16T00:00:00.000Z&previousEnd=2026-11-23T00:00:00.000Z';

const get = (query: string) =>
  GET(
    new Request(`http://localhost/api/mobile/v1/records/dashboard?${query}`, {
      headers: { Authorization: 'Bearer t' },
    })
  );

describe('GET /api/mobile/v1/records/dashboard', () => {
  beforeEach(() => {
    authorizeMobileRequest.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1' } });
    loadChallengeDashboard.mockReset().mockResolvedValue({
      availableMenuTypes: ['legal_moves'],
      selectedMenu: 'legal_moves',
      sessions: [],
      previousSessions: [],
    });
  });

  it("loads the token user's dashboard for the ranges and the preferred menu", async () => {
    const response = await get(`${RANGES}&menu=legal_moves`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      availableMenuTypes: ['legal_moves'],
      selectedMenu: 'legal_moves',
      sessions: [],
      previousSessions: [],
    });
    expect(loadChallengeDashboard).toHaveBeenCalledWith('u1', 'legal_moves', {
      current: {
        start: new Date('2026-11-23T00:00:00.000Z'),
        end: new Date('2026-11-30T00:00:00.000Z'),
      },
      previous: {
        start: new Date('2026-11-16T00:00:00.000Z'),
        end: new Date('2026-11-23T00:00:00.000Z'),
      },
    });
  });

  it('drops a menu that is not a challenge, leaving the choice to reconciliation', async () => {
    await get(`${RANGES}&menu=knight_tour`);
    expect(loadChallengeDashboard).toHaveBeenCalledWith('u1', undefined, expect.anything());
  });

  it('refuses a request without every range edge', async () => {
    const response = await get('currentStart=2026-11-23T00:00:00.000Z');
    expect(response.status).toBe(400);
    expect(loadChallengeDashboard).not.toHaveBeenCalled();
  });

  it('answers the auth failure without loading anything', async () => {
    authorizeMobileRequest.mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    });
    const response = await get(RANGES);
    expect(response.status).toBe(401);
    expect(loadChallengeDashboard).not.toHaveBeenCalled();
  });
});
