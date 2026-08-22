import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit } from '@/lib/security/rate-limit';

const mockAuth = vi.fn();
const mockGetGameById = vi.fn();
const mockStoreFind = vi.fn();
const mockIsLlmConfigured = vi.fn();
const mockResolveState = vi.fn();
const mockFindLiveJob = vi.fn();
const mockEnqueue = vi.fn();
const mockProcess = vi.fn();
const mockAfter = vi.fn();

vi.mock('next/server', () => ({
  after: (cb: () => unknown) => mockAfter(cb),
}));

vi.mock('@/lib/auth', () => ({
  authenticateAndCheckBan: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock('@/lib/db/games-read', () => ({
  getGameById: (...args: unknown[]) => mockGetGameById(...args),
}));

vi.mock('@/lib/security/rate-limit');

vi.mock('@/lib/ai-review/entitlement', () => ({
  resolveAiReviewGenerationState: (...args: unknown[]) => mockResolveState(...args),
}));

vi.mock('@/lib/ai-review/jobs', () => ({
  findLiveAiReviewJob: (...args: unknown[]) => mockFindLiveJob(...args),
  enqueueAiReviewJob: (...args: unknown[]) => mockEnqueue(...args),
  processAiReviewJob: (...args: unknown[]) => mockProcess(...args),
}));

vi.mock('@/lib/ai-review/openai', () => ({
  isLlmConfigured: () => mockIsLlmConfigured(),
}));

vi.mock('@/lib/ai-review/queries', () => ({
  dbAiReviewStore: {
    find: (...args: unknown[]) => mockStoreFind(...args),
    save: vi.fn(),
  },
}));

vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: () => ({ success: false, error: 'unexpected_error' }),
}));

const GAME_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const JOB = { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', locale: 'en' };

const MOVES = ['e4', 'e5', 'Nf3', 'Nc6'];
const EVALS = Array.from({ length: MOVES.length + 1 }, () => ({ score: 10 }));

const FAKE_REVIEW = {
  content: {
    summary: ['s'],
    momentComments: [],
    strengths: ['a'],
    weaknesses: ['b'],
    advice: ['c'],
  },
  moments: [],
  summaryStats: {
    totalPlies: 4,
    playerColor: 'white',
    avgCpLossPlayer: 0,
    judgmentCountsPlayer: { best: 2, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
  },
  model: 'test-model',
  createdAt: '2026-08-14T00:00:00.000Z',
};

const { requestAiReviewAction } = await import('./request-ai-review');

function validInput() {
  return { gameId: GAME_ID, locale: 'en', evaluations: EVALS };
}

describe('requestAiReviewAction', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockGetGameById.mockResolvedValue({
      game: { id: GAME_ID, moves: MOVES, authorId: USER_ID },
      author: null,
    });
    mockStoreFind.mockResolvedValue(null);
    mockFindLiveJob.mockResolvedValue(null);
    // The coin payer — the viewer most cases below are about.
    mockResolveState.mockResolvedValue({ kind: 'payable', cost: 1, balance: 2 });
    mockIsLlmConfigured.mockReturnValue(true);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
    mockEnqueue.mockResolvedValue({ ok: true, job: JOB, alreadyQueued: false });
    mockProcess.mockResolvedValue(undefined);
    // Run the after() callback inline so the hand-off is observable.
    mockAfter.mockImplementation((cb: () => unknown) => void cb());
  });

  it('accepts a valid request: charges, enqueues, and kicks the worker after the response', async () => {
    const result = await requestAiReviewAction(validInput());

    expect(result).toEqual({ success: true, status: 'queued', job: JOB });
    expect(mockEnqueue).toHaveBeenCalledWith({
      game: expect.objectContaining({ id: GAME_ID }),
      locale: 'en',
      userId: USER_ID,
      evaluations: EVALS,
      charge: true,
    });
    expect(mockAfter).toHaveBeenCalledTimes(1);
    expect(mockProcess).toHaveBeenCalledWith(JOB.id);
  });

  it('does not charge a subscriber', async () => {
    mockResolveState.mockResolvedValue({ kind: 'allowed' });

    await requestAiReviewAction(validInput());

    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ charge: false }));
  });

  it('rejects unauthenticated callers before touching the game', async () => {
    mockAuth.mockResolvedValue({ error: 'signInRequired' });

    const result = await requestAiReviewAction(validInput());

    expect(result).toEqual({ success: false, error: 'not_authenticated' });
    expect(mockGetGameById).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('rejects malformed input (bad locale, bad uuid, bad evaluations)', async () => {
    expect(await requestAiReviewAction({ ...validInput(), locale: 'fr' })).toEqual({
      success: false,
      error: 'invalid_input',
    });
    expect(await requestAiReviewAction({ ...validInput(), gameId: 'nope' })).toEqual({
      success: false,
      error: 'invalid_input',
    });
    expect(
      await requestAiReviewAction({
        ...validInput(),
        evaluations: [{ score: Number.NaN }],
      })
    ).toEqual({ success: false, error: 'invalid_input' });
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('rejects an evaluation count that does not match the game', async () => {
    const result = await requestAiReviewAction({
      ...validInput(),
      evaluations: EVALS.slice(0, 2),
    });
    expect(result).toEqual({ success: false, error: 'invalid_input' });
  });

  it('404s on a hidden or missing game', async () => {
    mockGetGameById.mockResolvedValue(null);
    expect(await requestAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'not_found',
    });
  });

  it.each([
    ['a viewer who does not own the game', 'not_owner'],
    ['a game too short to coach', 'game_not_eligible'],
  ] as const)("refuses %s with the gate's own reason", async (_label, reason) => {
    mockResolveState.mockResolvedValue({ kind: 'blocked', reason });

    expect(await requestAiReviewAction(validInput())).toEqual({ success: false, error: reason });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('serves the cache without consuming the rate limit', async () => {
    mockStoreFind.mockResolvedValue(FAKE_REVIEW);

    const result = await requestAiReviewAction(validInput());

    expect(result).toEqual({ success: true, status: 'ready', review: FAKE_REVIEW });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('reports a job already in flight instead of charging again', async () => {
    mockFindLiveJob.mockResolvedValue(JOB);

    const result = await requestAiReviewAction(validInput());

    expect(result).toEqual({ success: true, status: 'queued', job: JOB });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('refuses the author who cannot pay, before spending a rate-limit slot', async () => {
    mockResolveState.mockResolvedValue({ kind: 'insufficient_balance', cost: 1, balance: 0 });

    expect(await requestAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'insufficient_balance',
    });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  // A review already published stays readable to its author for good: an
  // emptied wallet must not retract what the app has been serving to every
  // visitor of the shared game.
  it('still serves a cached review to an author who can no longer pay', async () => {
    mockResolveState.mockResolvedValue({ kind: 'insufficient_balance', cost: 1, balance: 0 });
    mockStoreFind.mockResolvedValue(FAKE_REVIEW);

    expect(await requestAiReviewAction(validInput())).toEqual({
      success: true,
      status: 'ready',
      review: FAKE_REVIEW,
    });
  });

  it('refuses without an LLM key, before spending a rate-limit slot', async () => {
    mockIsLlmConfigured.mockReturnValue(false);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await requestAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'llm_error',
    });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('maps a hit rate limit to rate_limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ error: 'rateLimited' });
    expect(await requestAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'rate_limited',
    });
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  // The page's balance is advisory; the charge re-checks under a lock.
  it('surfaces a balance that emptied between page load and click', async () => {
    mockEnqueue.mockResolvedValue({ ok: false, error: 'insufficient_balance' });
    expect(await requestAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'insufficient_balance',
    });
    expect(mockAfter).not.toHaveBeenCalled();
  });

  it('does not start a second worker for a job the enqueue found already live', async () => {
    mockEnqueue.mockResolvedValue({ ok: true, job: JOB, alreadyQueued: true });

    expect(await requestAiReviewAction(validInput())).toEqual({
      success: true,
      status: 'queued',
      job: JOB,
    });
    expect(mockAfter).not.toHaveBeenCalled();
  });

  it('returns unexpected_error when something throws', async () => {
    mockGetGameById.mockRejectedValue(new Error('db down'));
    expect(await requestAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'unexpected_error',
    });
  });
});
