import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  itRejectsUnauthenticatedCronCalls,
  makeCronRequest,
  restoreCronSecretAfterEach,
} from '../__test-support__/cron-auth';
import { GET } from './route';

vi.mock('@sentry/nextjs');

const mockRun = vi.fn();
vi.mock('@/lib/ads/awin-report/run-daily-report', () => ({
  runAwinDailyReport: () => mockRun(),
}));

const PATH = '/api/cron/awin-daily-report';

/** Auth gate and both post-auth outcomes of the daily Awin → Slack report. */
describe('GET /api/cron/awin-daily-report', () => {
  restoreCronSecretAfterEach();

  beforeEach(() => {
    mockRun.mockReset();
  });

  itRejectsUnauthenticatedCronCalls({ path: PATH, handler: GET, job: mockRun });

  it('runs the report when bearer matches CRON_SECRET exactly', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockRun.mockResolvedValueOnce({
      reportDate: '2026-10-01',
      clicks: 12,
      impressions: 0,
      transactionCount: 0,
    });

    const res = await GET(makeCronRequest(PATH, 'Bearer super-secret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: 'Awin daily report posted',
      reportDate: '2026-10-01',
      clicks: 12,
      impressions: 0,
      transactionCount: 0,
    });
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when the report throws (missing config, Awin error, rejected webhook)', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockRun.mockRejectedValueOnce(new Error('Awin daily report is not configured'));

    const res = await GET(makeCronRequest(PATH, 'Bearer super-secret'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
