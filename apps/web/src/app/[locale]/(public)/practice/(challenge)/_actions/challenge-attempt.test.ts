import { revalidateTag } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  authenticateAndCheckBan as mockAuthenticateAndCheckBan,
  authenticateAndGuard as mockAuthenticateAndGuard,
} from '@/lib/__mocks__/auth';
import { EXP_LEADERBOARD_CACHE_TAG, LEADERBOARD_CACHE_TAG } from '@/lib/cache-tags';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import {
  answerChallengeAttempt,
  beginChallengeAttempt,
  finishChallengeAttempt,
} from './challenge-attempt';

vi.mock('@/lib/auth');
vi.mock('@/lib/security/rate-limit');
// The rate-limit mock reads the real module through importActual, which
// imports `@/lib/db`; the real one builds a database client on import.
vi.mock('@/lib/db', () => ({ db: {} }));

const mockBegin = vi.fn();
const mockAnswer = vi.fn();
const mockFinish = vi.fn();
vi.mock('@/lib/challenge/attempts', () => ({
  beginChallengeAttempt: (...args: unknown[]) => mockBegin(...args),
  answerChallengeAttempt: (...args: unknown[]) => mockAnswer(...args),
  finishChallengeAttempt: (...args: unknown[]) => mockFinish(...args),
}));

const USER = { id: '11111111-1111-4111-8111-111111111111' };
const ATTEMPT_ID = '00000000-0000-4000-8000-000000000001';
const RESULT_ID = '33333333-3333-4333-8333-333333333333';

beforeEach(() => {
  mockAuthenticateAndGuard.mockResolvedValue({ user: USER });
  mockAuthenticateAndCheckBan.mockResolvedValue({ user: USER });
});

describe('beginChallengeAttempt', () => {
  it('starts the attempt for the signed-in player under the start rate limit', async () => {
    mockBegin.mockResolvedValue({
      ok: true,
      attemptId: ATTEMPT_ID,
      first: { sequence: 0, question: 'e4' },
    });

    const result = await beginChallengeAttempt('square_colors', {});

    expect(mockAuthenticateAndGuard).toHaveBeenCalledWith(RATE_LIMITS.beginChallengeAttempt);
    expect(mockBegin).toHaveBeenCalledWith({
      userId: USER.id,
      menuType: 'square_colors',
      rawSettings: {},
    });
    expect(result).toEqual({
      success: true,
      attemptId: ATTEMPT_ID,
      first: { sequence: 0, question: 'e4' },
    });
  });

  it('passes on a settings validation failure', async () => {
    mockBegin.mockResolvedValue({ ok: false, error: 'invalid_settings' });

    await expect(
      beginChallengeAttempt('coordinate_quiz', { boardOrientation: 'x' })
    ).resolves.toEqual({ success: false, error: 'invalid_settings' });
  });

  it('does not start an attempt when the guard fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'rateLimited' });

    await expect(beginChallengeAttempt('square_colors', {})).resolves.toEqual({
      success: false,
      error: 'rateLimited',
    });
    expect(mockBegin).not.toHaveBeenCalled();
  });
});

describe('answerChallengeAttempt', () => {
  it('takes the arrival time before authenticating and does not rate limit', async () => {
    vi.useFakeTimers({ now: 1_800_000_000_000 });
    try {
      mockAuthenticateAndCheckBan.mockImplementation(async () => {
        vi.advanceTimersByTime(250);
        return { user: USER };
      });
      const accepted = { status: 'accepted', correct: true, elapsedMs: 900, next: null };
      mockAnswer.mockResolvedValue(accepted);

      const result = await answerChallengeAttempt(ATTEMPT_ID, 3, 'light');

      expect(result).toEqual(accepted);
      expect(mockAnswer).toHaveBeenCalledWith({
        userId: USER.id,
        attemptId: ATTEMPT_ID,
        sequence: 3,
        rawAnswer: 'light',
        receivedAt: 1_800_000_000_000,
      });
      expect(mockAuthenticateAndGuard).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([['signInRequired'], ['banned']])('rejects the answer when %s', async (error) => {
    mockAuthenticateAndCheckBan.mockResolvedValue({ error });

    await expect(answerChallengeAttempt(ATTEMPT_ID, 0, 'light')).resolves.toEqual({
      status: 'rejected',
    });
    expect(mockAnswer).not.toHaveBeenCalled();
  });

  it('never invalidates a cache, so the response does not carry a page re-render', async () => {
    mockAnswer.mockResolvedValue({ status: 'expired' });

    await answerChallengeAttempt(ATTEMPT_ID, 0, 'light');

    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('throws a generic retryable failure when grading fails unexpectedly', async () => {
    mockAnswer.mockRejectedValue(new Error('db down'));

    await expect(answerChallengeAttempt(ATTEMPT_ID, 0, 'light')).rejects.toThrow(
      'Challenge answer temporarily unavailable'
    );
  });
});

describe('finishChallengeAttempt', () => {
  it('finishes under the finish rate limit and passes pending through with the time left', async () => {
    mockFinish.mockResolvedValue({ status: 'pending', remainingMs: 12_000 });

    const result = await finishChallengeAttempt(ATTEMPT_ID);

    expect(mockAuthenticateAndGuard).toHaveBeenCalledWith(RATE_LIMITS.finishChallengeAttempt);
    expect(mockFinish).toHaveBeenCalledWith({ userId: USER.id, attemptId: ATTEMPT_ID });
    expect(result).toEqual({ status: 'pending', remainingMs: 12_000 });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('returns the granted ranks and result id of a recorded run and invalidates both leaderboards', async () => {
    const grantedRanks = [{ slug: '5kyu', level: 10, color: 'orange' }];
    mockFinish.mockResolvedValue({
      status: 'recorded',
      challengeResultId: RESULT_ID,
      grantedRanks,
    });

    const result = await finishChallengeAttempt(ATTEMPT_ID);

    expect(result).toEqual({
      status: 'done',
      success: true,
      grantedRanks,
      challengeResultId: RESULT_ID,
    });
    expect(revalidateTag).toHaveBeenCalledWith(LEADERBOARD_CACHE_TAG, { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith(EXP_LEADERBOARD_CACHE_TAG, { expire: 0 });
  });

  it.each([
    [{ status: 'unrecorded' }],
    [{ status: 'refused', reason: 'implausible_speed' }],
    [{ status: 'rejected' }],
  ])('answers %o with the same failure, so the client cannot tell why', async (outcome) => {
    mockFinish.mockResolvedValue(outcome);

    const result = await finishChallengeAttempt(ATTEMPT_ID);

    expect(result).toEqual({ status: 'done', success: false, error: 'not_recorded' });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('does not finish when the guard fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    await expect(finishChallengeAttempt(ATTEMPT_ID)).resolves.toEqual({
      status: 'done',
      success: false,
      error: 'signInRequired',
    });
    expect(mockFinish).not.toHaveBeenCalled();
  });

  it('answers an unexpected failure as a failed save', async () => {
    mockFinish.mockRejectedValue(new Error('db down'));

    await expect(finishChallengeAttempt(ATTEMPT_ID)).resolves.toEqual({
      status: 'done',
      success: false,
      error: 'unexpected_error',
    });
  });
});
