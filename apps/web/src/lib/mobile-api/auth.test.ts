import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authorizeMobileRequest, readBearerToken } from './auth';

const getUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser } }),
  isAuthRetryableFetchError: (error: unknown) =>
    (error as { retryable?: boolean } | null)?.retryable === true,
}));
const isUserBanned = vi.fn();
vi.mock('@/lib/moderation/ban', () => ({ isUserBanned: (id: string) => isUserBanned(id) }));
const checkRateLimit = vi.fn();
vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (id: string, config: unknown) => checkRateLimit(id, config),
}));
vi.mock('server-only', () => ({}));

const request = (token?: string) =>
  new Request('http://localhost/api/mobile/v1/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const statusOf = async (result: Awaited<ReturnType<typeof authorizeMobileRequest>>) =>
  result.ok ? 200 : { status: result.response.status, body: await result.response.json() };

describe('readBearerToken', () => {
  it('reads the token after Bearer, case-insensitively', () => {
    expect(readBearerToken(request('abc'))).toBe('abc');
    expect(
      readBearerToken(new Request('http://x', { headers: { authorization: 'bearer t' } }))
    ).toBe('t');
    expect(readBearerToken(request())).toBeUndefined();
  });
});

describe('authorizeMobileRequest', () => {
  beforeEach(() => {
    getUser.mockReset();
    isUserBanned.mockReset().mockResolvedValue(false);
    checkRateLimit.mockReset().mockResolvedValue({ success: true });
  });

  it('refuses a request without a token', async () => {
    expect(await statusOf(await authorizeMobileRequest(request()))).toEqual({
      status: 401,
      body: { error: 'unauthorized' },
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('refuses a token the Auth server rejects', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    expect(await statusOf(await authorizeMobileRequest(request('bad')))).toMatchObject({
      status: 401,
    });
  });

  it('answers 503 when the Auth server cannot be reached', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { retryable: true } });
    expect(await statusOf(await authorizeMobileRequest(request('t')))).toEqual({
      status: 503,
      body: { error: 'authUnavailable' },
    });
  });

  it('accepts a valid token and checks the token it was given', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const result = await authorizeMobileRequest(request('good'));
    expect(result).toMatchObject({ ok: true, user: { id: 'u1' } });
    expect(getUser).toHaveBeenCalledWith('good');
  });

  it('refuses a banned user unless allowBanned', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    isUserBanned.mockResolvedValue(true);
    expect(await statusOf(await authorizeMobileRequest(request('t')))).toMatchObject({
      status: 403,
    });
    expect((await authorizeMobileRequest(request('t'), { allowBanned: true })).ok).toBe(true);
  });

  it('applies the per-user rate limit when given', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    checkRateLimit.mockResolvedValue({ error: 'rateLimited' });
    const config = { action: 'x', maxAttempts: 1, windowMs: 1 };
    expect(
      await statusOf(await authorizeMobileRequest(request('t'), { rateLimit: config }))
    ).toMatchObject({ status: 429 });
    expect(checkRateLimit).toHaveBeenCalledWith('u1', config);
  });
});
