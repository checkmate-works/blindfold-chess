import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from './route';

vi.mock('server-only', () => ({}));

const authorizeMobileRequest = vi.fn();
vi.mock('@/lib/mobile-api/auth', () => ({
  authorizeMobileRequest: (...args: unknown[]) => authorizeMobileRequest(...args),
  readBearerToken: (request: Request) =>
    request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1],
}));

const userHasProfile = vi.fn();
vi.mock('@/lib/auth', () => ({
  userHasProfile: (...args: unknown[]) => userHasProfile(...args),
}));
vi.mock('@/lib/security/rate-limit', () => ({ RATE_LIMITS: { toggleLike: {} } }));

const isMobilePuzzle = vi.fn();
vi.mock('@/lib/mobile-api/puzzles', () => ({
  isMobilePuzzle: (...args: unknown[]) => isMobilePuzzle(...args),
}));

const getLikeMeta = vi.fn();
vi.mock('@/lib/db/like-queries', () => ({
  getLikeMeta: (...args: unknown[]) => getLikeMeta(...args),
}));

const togglePositionLikeForUser = vi.fn();
vi.mock('@/lib/positions/like-actions', () => ({
  POSITION_LIKE_TARGET: 'position',
  togglePositionLikeForUser: (...args: unknown[]) => togglePositionLikeForUser(...args),
}));

const ID = '11111111-1111-4111-8111-111111111111';
const params = { params: Promise.resolve({ id: ID }) };
const request = (method: string, token?: string) =>
  new Request(`http://localhost/api/mobile/v1/puzzles/${ID}/like`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

describe('/api/mobile/v1/puzzles/[id]/like', () => {
  beforeEach(() => {
    authorizeMobileRequest.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1' } });
    userHasProfile.mockReset().mockResolvedValue(true);
    isMobilePuzzle.mockReset().mockResolvedValue(true);
    getLikeMeta.mockReset().mockResolvedValue({ likeCount: 3, likedByMe: true });
    togglePositionLikeForUser.mockReset().mockResolvedValue({ liked: true, likeCount: 4 });
  });

  it('answers the count without a token, as not liked by anyone in particular', async () => {
    getLikeMeta.mockResolvedValue({ likeCount: 3, likedByMe: false });
    const response = await GET(request('GET'), params);

    expect(await response.json()).toEqual({ liked: false, likeCount: 3 });
    expect(authorizeMobileRequest).not.toHaveBeenCalled();
    expect(getLikeMeta).toHaveBeenCalledWith('position', ID, undefined);
  });

  it("reads the token user's own like", async () => {
    const response = await GET(request('GET', 't'), params);

    expect(await response.json()).toEqual({ liked: true, likeCount: 3 });
    expect(getLikeMeta).toHaveBeenCalledWith('position', ID, 'u1');
  });

  it('answers 404 for a puzzle the app does not offer, without reading likes', async () => {
    isMobilePuzzle.mockResolvedValue(false);

    expect((await GET(request('GET'), params)).status).toBe(404);
    expect((await POST(request('POST', 't'), params)).status).toBe(404);
    expect(getLikeMeta).not.toHaveBeenCalled();
    expect(togglePositionLikeForUser).not.toHaveBeenCalled();
  });

  it('toggles the like for the token user', async () => {
    const response = await POST(request('POST', 't'), params);

    expect(await response.json()).toEqual({ liked: true, likeCount: 4 });
    expect(togglePositionLikeForUser).toHaveBeenCalledWith('u1', ID);
  });

  it('refuses a user without a username with profileRequired', async () => {
    userHasProfile.mockResolvedValue(false);
    const response = await POST(request('POST', 't'), params);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'profileRequired' });
    expect(togglePositionLikeForUser).not.toHaveBeenCalled();
  });

  it('passes a block through as 403', async () => {
    togglePositionLikeForUser.mockResolvedValue({ error: 'blocked' });
    const response = await POST(request('POST', 't'), params);

    expect(response.status).toBe(403);
  });
});
