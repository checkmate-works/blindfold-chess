import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

vi.mock('@sentry/nextjs');

const mockSweep = vi.fn();
vi.mock('@/lib/ai-review/jobs', () => ({
  sweepAiReviewJobs: () => mockSweep(),
}));

/**
 * The AI review job sweeper shares `requireCronAuth` / `runCronJob` with the
 * other cron routes, so the auth matrix is covered once in
 * `reap-old-feed-items/route.test.ts`; this checks the wiring on either side
 * of it — an unauthorised call never sweeps, an authorised one reports the
 * sweep's counts, and a sweep that throws is a 500, not a crash.
 */
describe('GET /api/cron/ai-review-jobs', () => {
  const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

  beforeEach(() => {
    mockSweep.mockReset();
    process.env.CRON_SECRET = 'super-secret';
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
    if (authHeader !== undefined) headers.set('authorization', authHeader);
    return new Request('http://localhost/api/cron/ai-review-jobs', { method: 'GET', headers });
  }

  it('refuses a wrong bearer without sweeping', async () => {
    const res = await GET(makeRequest('Bearer wrong'));
    expect(res.status).toBe(401);
    expect(mockSweep).not.toHaveBeenCalled();
  });

  it('sweeps and reports the counts when the bearer matches', async () => {
    mockSweep.mockResolvedValueOnce({ retried: 1, failed: 2 });

    const res = await GET(makeRequest('Bearer super-secret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'AI review jobs swept', retried: 1, failed: 2 });
    expect(mockSweep).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when the sweep throws', async () => {
    mockSweep.mockRejectedValueOnce(new Error('boom'));

    const res = await GET(makeRequest('Bearer super-secret'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
