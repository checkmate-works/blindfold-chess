import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  itRejectsUnauthenticatedCronCalls,
  makeCronRequest,
  restoreCronSecretAfterEach,
} from '../__test-support__/cron-auth';
import { GET } from './route';

vi.mock('@sentry/nextjs');

const mockAudit = vi.fn();
vi.mock('@/lib/billing/stale-subscription-periods', () => ({
  reportStaleSubscriptionPeriods: () => mockAudit(),
}));

const PATH = '/api/cron/audit-subscription-periods';

/** Auth gate and both post-auth outcomes of the stale-subscription-period audit. */
describe('GET /api/cron/audit-subscription-periods — auth', () => {
  restoreCronSecretAfterEach();

  beforeEach(() => {
    mockAudit.mockReset();
  });

  itRejectsUnauthenticatedCronCalls({ path: PATH, handler: GET, job: mockAudit });

  it('proceeds to the audit when bearer matches CRON_SECRET exactly', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockAudit.mockResolvedValueOnce({
      staleCount: 0,
      truncated: false,
      cutoff: '2026-09-13T07:00:00.000Z',
      checkedAt: '2026-09-16T07:00:00.000Z',
    });

    const res = await GET(makeCronRequest(PATH, 'Bearer super-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      message: 'Stale-subscription-period audit completed',
      staleCount: 0,
      truncated: false,
    });
    expect(mockAudit).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when the audit throws (post-auth error path)', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockAudit.mockRejectedValueOnce(new Error('boom'));

    const res = await GET(makeCronRequest(PATH, 'Bearer super-secret'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
  });
});
