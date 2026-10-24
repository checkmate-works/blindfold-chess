import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  itRejectsUnauthenticatedCronCalls,
  makeCronRequest,
  restoreCronSecretAfterEach,
} from '../__test-support__/cron-auth';
import { GET } from './route';

vi.mock('@sentry/nextjs');

const mockReap = vi.fn();
const mockReapMemberJoined = vi.fn();
vi.mock('@/lib/feed-items/reap-old-feed-items', () => ({
  reapOldRankUpdateFeedItems: (...args: unknown[]) => mockReap(...args),
  reapOldMemberJoinedFeedItems: (...args: unknown[]) => mockReapMemberJoined(...args),
}));

const emptyReport = {
  removed: 0,
  batches: 0,
  timedOut: false,
  startedAt: '2026-05-04T00:00:00.000Z',
  finishedAt: '2026-05-04T00:00:00.001Z',
};

const PATH = '/api/cron/reap-old-feed-items';

/** Auth gate and both post-auth outcomes of the feed-item reapers. */
describe('GET /api/cron/reap-old-feed-items — auth', () => {
  restoreCronSecretAfterEach();

  beforeEach(() => {
    mockReap.mockReset();
    mockReapMemberJoined.mockReset();
    mockReapMemberJoined.mockResolvedValue(emptyReport);
  });

  itRejectsUnauthenticatedCronCalls({ path: PATH, handler: GET, job: mockReap });

  it('proceeds to the reaper when bearer matches CRON_SECRET exactly', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockReap.mockResolvedValueOnce(emptyReport);
    mockReapMemberJoined.mockResolvedValueOnce({ ...emptyReport, removed: 3, batches: 1 });

    const res = await GET(makeCronRequest(PATH, 'Bearer super-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      message: 'Feed-item reaper completed',
      removed: 0,
      batches: 0,
      timedOut: false,
      memberJoined: { removed: 3, batches: 1 },
    });
    expect(mockReap).toHaveBeenCalledTimes(1);
    expect(mockReapMemberJoined).toHaveBeenCalledTimes(1);
  });

  it('runs both reapers with budgets that fit under the 60s function timeout', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockReap.mockResolvedValueOnce(emptyReport);

    await GET(makeCronRequest(PATH, 'Bearer super-secret'));

    const [{ budgetMs: rankBudget }] = mockReap.mock.calls[0];
    const [{ budgetMs: memberJoinedBudget }] = mockReapMemberJoined.mock.calls[0];
    expect(rankBudget + memberJoinedBudget).toBeLessThan(60_000);
  });

  it('returns 500 when the reaper throws (post-auth error path)', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockReap.mockRejectedValueOnce(new Error('boom'));

    const res = await GET(makeCronRequest(PATH, 'Bearer super-secret'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
  });
});
