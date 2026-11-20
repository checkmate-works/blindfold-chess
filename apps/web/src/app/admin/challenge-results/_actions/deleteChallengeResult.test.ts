import { revalidatePath, revalidateTag } from 'next/cache';

import { describe, expect, it, vi } from 'vitest';

import { EXP_LEADERBOARD_CACHE_TAG, LEADERBOARD_CACHE_TAG } from '@/lib/cache-tags';
import type { RemovedChallengeResult } from '@/lib/challenge/remove-result';
import { MODERATION_REASON_MAX_LENGTH } from '@/lib/moderation/validate-reason';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { deleteChallengeResult } from './deleteChallengeResult';

const mockSelectFromWhere = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockTransaction = vi.fn();
const mockRemoveChallengeResult = vi.fn();

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/security/client-ip');

vi.mock('@/lib/db', async () => {
  const { adminModerationDbMock } =
    await import('@/lib/db/__test-support__/admin-moderation-db-mock');

  return adminModerationDbMock(() => ({
    selectFromWhere: mockSelectFromWhere,
    updateWhere: mockUpdateSetWhere,
    insertValues: mockInsertValues,
    transaction: mockTransaction,
  }));
});

vi.mock('@/lib/challenge/remove-result', () => ({
  removeChallengeResult: (...args: unknown[]) => mockRemoveChallengeResult(...args),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const resultId = '11111111-1111-4111-8111-111111111111';
const reason = '  Impossible time for a perfect score  ';

const removed: RemovedChallengeResult = {
  id: resultId,
  userId: 'player-00000000-0000-0000-0000-000000000001',
  menuType: 'coordinate_quiz',
  leaderboardKey: 'white',
  score: 99,
  incorrectAnswers: 0,
  timeTaken: 3,
  createdAt: new Date('2026-11-20T08:00:00.000Z'),
  attemptId: 'attempt-00000000-0000-0000-0000-000000000001',
  bestBefore: { score: 99, incorrectAnswers: 0, timeTaken: 3 },
  bestAfter: { score: 40, incorrectAnswers: 2, timeTaken: 60 },
  expReversed: 198,
};

function signInAsAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]);
}

function expectNothingWritten() {
  expect(mockTransaction).not.toHaveBeenCalled();
  expect(mockRemoveChallengeResult).not.toHaveBeenCalled();
  expect(mockInsertValues).not.toHaveBeenCalled();
  expect(revalidateTag).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
}

describe('deleteChallengeResult', () => {
  it('returns unauthorized when nobody is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    expect(await deleteChallengeResult(resultId, reason)).toEqual({ error: 'unauthorized' });
    expectNothingWritten();
  });

  it('returns unauthorized for a signed-in user who is not an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'user' }]);

    expect(await deleteChallengeResult(resultId, reason)).toEqual({ error: 'unauthorized' });
    expectNothingWritten();
  });

  it('rejects an id that is not a UUID before touching the database', async () => {
    signInAsAdmin();

    expect(await deleteChallengeResult('not-a-uuid', reason)).toEqual({
      error: 'invalidChallengeResultId',
    });
    expectNothingWritten();
  });

  it('requires a reason', async () => {
    signInAsAdmin();

    expect(await deleteChallengeResult(resultId, '   ')).toEqual({ error: 'reasonRequired' });
    expectNothingWritten();
  });

  it('rejects a reason over the length limit', async () => {
    signInAsAdmin();

    expect(
      await deleteChallengeResult(resultId, 'x'.repeat(MODERATION_REASON_MAX_LENGTH + 1))
    ).toEqual({ error: 'reasonTooLong' });
    expectNothingWritten();
  });

  it('writes no audit entry when no live result has the id (unknown or already removed)', async () => {
    signInAsAdmin();
    mockRemoveChallengeResult.mockResolvedValueOnce(null);

    expect(await deleteChallengeResult(resultId, reason)).toEqual({
      error: 'challengeResultNotFound',
    });
    expect(mockRemoveChallengeResult).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('removes the result and logs the removed score, the best before and after and the Exp taken back in the same transaction', async () => {
    signInAsAdmin();
    mockRemoveChallengeResult.mockResolvedValueOnce(removed);

    expect(await deleteChallengeResult(resultId, reason)).toEqual({ success: true });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockRemoveChallengeResult).toHaveBeenCalledWith(
      expect.anything(),
      resultId,
      expect.any(Date)
    );
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({
      actorId: adminUserId,
      action: 'delete_challenge_result',
      targetType: 'challenge_result',
      targetId: resultId,
      reason: 'Impossible time for a perfect score',
      metadata: {
        playerId: removed.userId,
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        score: 99,
        incorrectAnswers: 0,
        timeTaken: 3,
        recordedAt: '2026-11-20T08:00:00.000Z',
        attemptId: removed.attemptId,
        bestBefore: removed.bestBefore,
        bestAfter: removed.bestAfter,
        expReversed: 198,
      },
      ipAddress: '127.0.0.1',
    });
  });

  it('expires the ranking caches and the admin list after a removal', async () => {
    signInAsAdmin();
    mockRemoveChallengeResult.mockResolvedValueOnce(removed);

    await deleteChallengeResult(resultId, reason);

    expect(revalidateTag).toHaveBeenCalledWith(LEADERBOARD_CACHE_TAG, { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith(EXP_LEADERBOARD_CACHE_TAG, { expire: 0 });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/challenge-results');
  });

  it('expires nothing when the transaction fails', async () => {
    signInAsAdmin();
    mockRemoveChallengeResult.mockRejectedValueOnce(new Error('DB transaction failed'));

    await expect(deleteChallengeResult(resultId, reason)).rejects.toThrow('DB transaction failed');
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
