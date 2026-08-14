import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.fn();
const mockGetGameById = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockDetectOpening = vi.fn();
const mockGenerateReview = vi.fn();
const mockStoreFind = vi.fn();

vi.mock('@/lib/auth', () => ({
  authenticateAndCheckBan: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock('@/lib/db/games-read', () => ({
  getGameById: (...args: unknown[]) => mockGetGameById(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    generateAiReview: { action: 'generate_ai_review', maxAttempts: 5, windowMs: 86_400_000 },
  },
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock('@/lib/openings/detect-game-opening', () => ({
  detectGameOpening: (...args: unknown[]) => mockDetectOpening(...args),
}));

vi.mock('@/lib/ai-review/generate-review', () => ({
  generateReview: (...args: unknown[]) => mockGenerateReview(...args),
}));

vi.mock('@/lib/ai-review/openai', () => ({
  createOpenAiClient: () => ({ model: 'test-model', complete: vi.fn() }),
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

const MOVES = ['e4', 'e5', 'Nf3', 'Nc6'];
const EVALS = Array.from({ length: MOVES.length + 1 }, () => ({ score: 10 }));

const FAKE_REVIEW = {
  content: {
    summary: 's',
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

const { generateAiReviewAction } = await import('./generate-ai-review');

function validInput() {
  return { gameId: GAME_ID, locale: 'en', evaluations: EVALS };
}

describe('generateAiReviewAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockGetGameById.mockResolvedValue({ game: { id: GAME_ID, moves: MOVES }, author: null });
    mockStoreFind.mockResolvedValue(null);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockDetectOpening.mockResolvedValue({ slug: 'italian', name: 'Italian Game', ecoCode: 'C50' });
    mockGenerateReview.mockResolvedValue({ ok: true, review: FAKE_REVIEW });
  });

  it('generates and returns the review for a valid request', async () => {
    const result = await generateAiReviewAction(validInput());

    expect(result).toEqual({ success: true, review: FAKE_REVIEW });
    expect(mockGenerateReview).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        locale: 'en',
        openingName: 'Italian Game',
      })
    );
  });

  it('rejects unauthenticated callers before touching the game', async () => {
    mockAuth.mockResolvedValue({ error: 'signInRequired' });

    const result = await generateAiReviewAction(validInput());

    expect(result).toEqual({ success: false, error: 'not_authenticated' });
    expect(mockGenerateReview).not.toHaveBeenCalled();
  });

  it('rejects malformed input (bad locale, bad uuid, bad evaluations)', async () => {
    expect(await generateAiReviewAction({ ...validInput(), locale: 'fr' })).toEqual({
      success: false,
      error: 'invalid_input',
    });
    expect(await generateAiReviewAction({ ...validInput(), gameId: 'nope' })).toEqual({
      success: false,
      error: 'invalid_input',
    });
    expect(
      await generateAiReviewAction({
        ...validInput(),
        evaluations: [{ score: Number.NaN }],
      })
    ).toEqual({ success: false, error: 'invalid_input' });
    expect(mockGenerateReview).not.toHaveBeenCalled();
  });

  it('rejects an evaluation count that does not match the game', async () => {
    const result = await generateAiReviewAction({
      ...validInput(),
      evaluations: EVALS.slice(0, 2),
    });
    expect(result).toEqual({ success: false, error: 'invalid_input' });
  });

  it('404s on a hidden or missing game', async () => {
    mockGetGameById.mockResolvedValue(null);
    expect(await generateAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'not_found',
    });
  });

  it('refuses games too short to coach', async () => {
    mockGetGameById.mockResolvedValue({ game: { id: GAME_ID, moves: ['e4'] }, author: null });
    expect(
      await generateAiReviewAction({ ...validInput(), evaluations: EVALS.slice(0, 2) })
    ).toEqual({ success: false, error: 'game_not_eligible' });
  });

  it('serves the cache without consuming the rate limit', async () => {
    mockStoreFind.mockResolvedValue(FAKE_REVIEW);

    const result = await generateAiReviewAction(validInput());

    expect(result).toEqual({ success: true, review: FAKE_REVIEW });
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockGenerateReview).not.toHaveBeenCalled();
  });

  it('maps a hit rate limit to rate_limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ error: 'rateLimited' });
    expect(await generateAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'rate_limited',
    });
    expect(mockGenerateReview).not.toHaveBeenCalled();
  });

  it('propagates generation failures', async () => {
    mockGenerateReview.mockResolvedValue({ ok: false, error: 'llm_error' });
    expect(await generateAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'llm_error',
    });
  });

  it('returns unexpected_error when something throws', async () => {
    mockGetGameById.mockRejectedValue(new Error('db down'));
    expect(await generateAiReviewAction(validInput())).toEqual({
      success: false,
      error: 'unexpected_error',
    });
  });
});
