import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

const mockReap = vi.fn();
vi.mock('@/lib/post-images/reap-orphaned-images', () => ({
  reapOrphanedPostImages: () => mockReap(),
}));

/**
 * Auth tests for the post-image reaper cron route.
 *
 * Covers:
 *   - SEC-006 misconfig: when CRON_SECRET is unset/empty, return 500
 *     instead of accidentally accepting `Bearer undefined`.
 *   - SEC-006 timing-safe compare: a wrong header returns 401, a
 *     correct header proceeds. We do not assert on actual timing here
 *     (Vitest cannot reliably measure constant-time behavior); we
 *     instead assert response shapes and that mismatched-length
 *     headers cleanly return 401 without throwing.
 */
describe('GET /api/cron/reap-post-images — auth', () => {
  const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

  beforeEach(() => {
    mockReap.mockReset();
  });

  afterEach(() => {
    if (ORIGINAL_CRON_SECRET === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
    }
  });

  function makeRequest(authHeader?: string): Request {
    const headers = new Headers();
    if (authHeader !== undefined) {
      headers.set('authorization', authHeader);
    }
    return new Request('http://localhost/api/cron/reap-post-images', {
      method: 'GET',
      headers,
    });
  }

  it('returns 500 when CRON_SECRET is unset (misconfig — must not accept "Bearer undefined")', async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(makeRequest('Bearer undefined'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Server misconfigured' });
    expect(mockReap).not.toHaveBeenCalled();
  });

  it('returns 500 when CRON_SECRET is empty string (also a misconfig)', async () => {
    process.env.CRON_SECRET = '';

    const res = await GET(makeRequest('Bearer '));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Server misconfigured' });
    expect(mockReap).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header is missing', async () => {
    process.env.CRON_SECRET = 'super-secret';

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(mockReap).not.toHaveBeenCalled();
  });

  it('returns 401 when bearer token does not match', async () => {
    process.env.CRON_SECRET = 'super-secret';

    const res = await GET(makeRequest('Bearer wrong-secret'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(mockReap).not.toHaveBeenCalled();
  });

  it('returns 401 when header length differs from expected (mismatched-length must not throw)', async () => {
    process.env.CRON_SECRET = 'super-secret-very-long';

    // timingSafeEqual itself throws on unequal-length inputs; the route
    // must short-circuit before calling it. If this test ever surfaces
    // a 500, the length-guard regressed.
    const res = await GET(makeRequest('Bearer x'));
    expect(res.status).toBe(401);
    expect(mockReap).not.toHaveBeenCalled();
  });

  it('proceeds to the reaper when bearer matches CRON_SECRET exactly', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockReap.mockResolvedValueOnce({ removed: 0, examined: 0 });

    const res = await GET(makeRequest('Bearer super-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      message: 'Post-image reaper completed',
      removed: 0,
      examined: 0,
    });
    expect(mockReap).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when the reaper throws (post-auth error path)', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockReap.mockRejectedValueOnce(new Error('boom'));

    const res = await GET(makeRequest('Bearer super-secret'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
  });
});
