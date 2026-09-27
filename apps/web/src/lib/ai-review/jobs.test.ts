import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockChain } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockSelect = vi.fn();
const mockGetAiReview = vi.fn();

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: { select: (...args: unknown[]) => mockSelect(...args) },
}));
vi.mock('./queries', () => ({
  dbAiReviewStore: {},
  getAiReview: (...args: unknown[]) => mockGetAiReview(...args),
}));
vi.mock('./generate-review', () => ({ generateReview: vi.fn() }));
vi.mock('./openai', () => ({ createOpenAiClient: vi.fn() }));
vi.mock('@/lib/points', () => ({ chargeAiReview: vi.fn(), refundAiReviewCharge: vi.fn() }));
vi.mock('@/lib/notifications/notification', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/openings/detect-game-opening', () => ({ detectGameOpening: vi.fn() }));
vi.mock('@/lib/db/games-read', () => ({ getGameById: vi.fn() }));

const { getAiReviewJobStatus } = await import('./jobs');

function jobFound(job: Record<string, unknown> | undefined) {
  mockSelect.mockReturnValue(mockChain(job ? [job] : []));
}

describe('getAiReviewJobStatus', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockGetAiReview.mockReset();
  });

  it('returns not_found when the viewer has no such job', async () => {
    jobFound(undefined);
    await expect(getAiReviewJobStatus('job-1', 'user-1')).resolves.toEqual({
      status: 'not_found',
    });
  });

  it.each(['pending', 'processing'])('reports a %s job as pending', async (status) => {
    jobFound({ status, gameId: 'g', locale: 'en', error: null });
    await expect(getAiReviewJobStatus('job-1', 'user-1')).resolves.toEqual({ status: 'pending' });
  });

  it('returns the review for a done job', async () => {
    const review = { summary: 'ok' };
    jobFound({ status: 'done', gameId: 'g', locale: 'en', error: null });
    mockGetAiReview.mockResolvedValue(review);
    await expect(getAiReviewJobStatus('job-1', 'user-1')).resolves.toEqual({
      status: 'done',
      review,
    });
    expect(mockGetAiReview).toHaveBeenCalledWith('g', 'en');
  });

  it('reports a done job whose review row is gone as pending', async () => {
    jobFound({ status: 'done', gameId: 'g', locale: 'en', error: null });
    mockGetAiReview.mockResolvedValue(null);
    await expect(getAiReviewJobStatus('job-1', 'user-1')).resolves.toEqual({ status: 'pending' });
  });

  it('returns the recorded error for a failed job', async () => {
    jobFound({ status: 'failed', gameId: 'g', locale: 'en', error: 'invalid_output' });
    await expect(getAiReviewJobStatus('job-1', 'user-1')).resolves.toEqual({
      status: 'failed',
      error: 'invalid_output',
    });
  });

  it('falls back to llm_error when a failed job has no recorded error', async () => {
    jobFound({ status: 'failed', gameId: 'g', locale: 'en', error: null });
    await expect(getAiReviewJobStatus('job-1', 'user-1')).resolves.toEqual({
      status: 'failed',
      error: 'llm_error',
    });
  });
});
