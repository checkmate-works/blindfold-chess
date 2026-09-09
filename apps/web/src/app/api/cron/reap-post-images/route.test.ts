import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  itRejectsUnauthenticatedCronCalls,
  makeCronRequest,
  restoreCronSecretAfterEach,
} from '../__test-support__/cron-auth';
import { GET } from './route';

vi.mock('@sentry/nextjs');

const mockReap = vi.fn();
vi.mock('@/lib/post-images/reap-orphaned-images', () => ({
  reapOrphanedPostImages: () => mockReap(),
}));

const PATH = '/api/cron/reap-post-images';

/** Auth gate and both post-auth outcomes of the post-image reaper. */
describe('GET /api/cron/reap-post-images — auth', () => {
  restoreCronSecretAfterEach();

  beforeEach(() => {
    mockReap.mockReset();
  });

  itRejectsUnauthenticatedCronCalls({ path: PATH, handler: GET, job: mockReap });

  it('proceeds to the reaper when bearer matches CRON_SECRET exactly', async () => {
    process.env.CRON_SECRET = 'super-secret';
    mockReap.mockResolvedValueOnce({ removed: 0, examined: 0 });

    const res = await GET(makeCronRequest(PATH, 'Bearer super-secret'));
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

    const res = await GET(makeCronRequest(PATH, 'Bearer super-secret'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
  });
});
