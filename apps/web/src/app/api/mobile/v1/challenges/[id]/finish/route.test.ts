import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const authorizeMobileRequest = vi.fn();
vi.mock('@/lib/mobile-api/auth', () => ({
  authorizeMobileRequest: (...args: unknown[]) => authorizeMobileRequest(...args),
}));
vi.mock('server-only', () => ({}));

const finishAttemptForUser = vi.fn();
vi.mock('@/lib/challenge/finish-response', () => ({
  finishAttemptForUser: (...args: unknown[]) => finishAttemptForUser(...args),
}));

const getChallengeResultSummary = vi.fn();
vi.mock('@/lib/mobile-api/challenge-result-summary', () => ({
  getChallengeResultSummary: (...args: unknown[]) => getChallengeResultSummary(...args),
}));
vi.mock('@/lib/security/rate-limit', () => ({ RATE_LIMITS: { finishChallengeAttempt: {} } }));

const post = () =>
  POST(
    new Request('http://localhost/api/mobile/v1/challenges/a1/finish', {
      method: 'POST',
      headers: { Authorization: 'Bearer t' },
    }),
    { params: Promise.resolve({ id: 'a1' }) }
  );

const SUMMARY = {
  exp: { earnedExp: 12, totalExp: 120, level: 3, levelUp: false, progressPercent: 40 },
  record: {
    status: 'new-best',
    currentScore: 9,
    previousBestScore: 7,
    previousLastScore: 5,
    diffFromLast: 4,
  },
  menuType: 'square_colors',
  leaderboardKey: 'default',
  placements: [{ period: 'weekly', rank: 9 }],
};

describe('POST /api/mobile/v1/challenges/[id]/finish', () => {
  beforeEach(() => {
    authorizeMobileRequest.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1' } });
    finishAttemptForUser.mockReset();
    getChallengeResultSummary.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('adds the summary of the recorded result', async () => {
    finishAttemptForUser.mockResolvedValue({
      status: 'done',
      success: true,
      grantedRanks: [],
      challengeResultId: 'r1',
    });
    getChallengeResultSummary.mockResolvedValue(SUMMARY);

    const body = await (await post()).json();

    expect(getChallengeResultSummary).toHaveBeenCalledWith('u1', 'r1');
    expect(body).toEqual({
      status: 'done',
      success: true,
      grantedRanks: [],
      challengeResultId: 'r1',
      summary: SUMMARY,
    });
  });

  it('answers a null summary, not a failure, when the summary cannot be read', async () => {
    finishAttemptForUser.mockResolvedValue({
      status: 'done',
      success: true,
      grantedRanks: [],
      challengeResultId: 'r1',
    });
    getChallengeResultSummary.mockRejectedValue(new Error('db down'));

    const response = await post();

    expect(response.status).toBe(200);
    expect((await response.json()).summary).toBeNull();
  });

  it('passes a pending or unrecorded finish through without a summary', async () => {
    finishAttemptForUser.mockResolvedValue({ status: 'pending', remainingMs: 300 });
    expect(await (await post()).json()).toEqual({ status: 'pending', remainingMs: 300 });

    finishAttemptForUser.mockResolvedValue({
      status: 'done',
      success: false,
      error: 'not_recorded',
    });
    expect((await (await post()).json()).summary).toBeUndefined();
    expect(getChallengeResultSummary).not.toHaveBeenCalled();
  });
});
