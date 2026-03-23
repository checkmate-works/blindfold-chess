import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChallengeResultInput } from './save-challenge-result';
import { saveChallengeResult } from './save-challenge-result';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockInsertValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockSelectResult = vi.fn<() => unknown[]>().mockReturnValue([]);

const mockGetUserAllTimeRank = vi.fn().mockResolvedValue({ rank: 5 });

vi.mock('./challenge-queries', () => ({
  getUserAllTimeRank: (...args: unknown[]) => mockGetUserAllTimeRank(...args),
}));

vi.mock('./index', () => {
  const challengeResultId = 'result-00000000-0000-0000-0000-000000000001';

  const makeDbOps = () => ({
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          returning: () => [{ id: challengeResultId }],
          onConflictDoUpdate: (...conflictArgs: unknown[]) => {
            mockOnConflictDoUpdate(...conflictArgs);
          },
        };
      },
    }),
    select: () => ({
      from: () => ({
        where: () => mockSelectResult(),
      }),
    }),
  });

  return {
    db: {
      ...makeDbOps(),
      transaction: async (fn: (tx: ReturnType<typeof makeDbOps>) => Promise<void>) => {
        mockTransaction();
        return fn(makeDbOps());
      },
    },
    challengeResults: {
      id: 'id',
      userId: 'user_id',
      menuType: 'menu_type',
      leaderboardKey: 'leaderboard_key',
      score: 'score',
      incorrectAnswers: 'incorrect_answers',
      timeTaken: 'time_taken',
    },
    challengeBestScores: {
      userId: 'user_id',
      menuType: 'menu_type',
      leaderboardKey: 'leaderboard_key',
      score: 'score',
      incorrectAnswers: 'incorrect_answers',
      timeTaken: 'time_taken',
      achievedAt: 'achieved_at',
      updatedAt: 'updated_at',
    },
    feedItems: {
      entityType: 'entity_type',
      entityId: 'entity_id',
      actorId: 'actor_id',
      metadata: 'metadata',
    },
  };
});

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const validInput: ChallengeResultInput = {
  userId: 'user-00000000-0000-0000-0000-000000000001',
  menuType: 'coordinate_quiz',
  leaderboardKey: 'white',
  score: 25,
  incorrectAnswers: 3,
  timeTaken: 45,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('saveChallengeResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResult.mockReturnValue([]);
  });

  // -------------------------------------------------------------------------
  // Transaction behavior
  // -------------------------------------------------------------------------

  it('should use db.transaction to wrap all writes atomically', async () => {
    await saveChallengeResult(validInput);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // challenge_results insert (append-only log)
  // -------------------------------------------------------------------------

  it('should insert into challenge_results with correct values', async () => {
    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenNthCalledWith(1, {
      userId: validInput.userId,
      menuType: validInput.menuType,
      leaderboardKey: validInput.leaderboardKey,
      score: validInput.score,
      incorrectAnswers: validInput.incorrectAnswers,
      timeTaken: validInput.timeTaken,
    });
  });

  // -------------------------------------------------------------------------
  // challenge_best_scores upsert
  // -------------------------------------------------------------------------

  it('should upsert into challenge_best_scores with correct values', async () => {
    await saveChallengeResult(validInput);

    // Second call to mockInsertValues is the best scores insert
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: validInput.userId,
        menuType: validInput.menuType,
        leaderboardKey: validInput.leaderboardKey,
        score: validInput.score,
        incorrectAnswers: validInput.incorrectAnswers,
        timeTaken: validInput.timeTaken,
      })
    );
  });

  it('should call onConflictDoUpdate for the best scores upsert', async () => {
    await saveChallengeResult(validInput);

    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it('should configure onConflictDoUpdate with the correct composite target', async () => {
    await saveChallengeResult(validInput);

    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.arrayContaining([
          expect.anything(), // userId
          expect.anything(), // menuType
          expect.anything(), // leaderboardKey
        ]),
      })
    );
  });

  // -------------------------------------------------------------------------
  // Feed item insertion on new entry
  // -------------------------------------------------------------------------

  it('should insert feed_item when user has no previous best score (new entry)', async () => {
    mockSelectResult.mockReturnValue([]);

    await saveChallengeResult(validInput);

    // 3 inserts: challenge_results, challenge_best_scores, feed_items
    expect(mockInsertValues).toHaveBeenCalledTimes(3);
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        entityType: 'challenge_rank_update',
        actorId: validInput.userId,
        metadata: expect.objectContaining({
          menuType: validInput.menuType,
          leaderboardKey: validInput.leaderboardKey,
          score: validInput.score,
          isNewEntry: true,
        }),
      })
    );
  });

  it('should insert feed_item when score improves', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(3);
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        entityType: 'challenge_rank_update',
        metadata: expect.objectContaining({
          isNewEntry: false,
          score: validInput.score,
        }),
      })
    );
  });

  it('should NOT insert feed_item when score does not improve', async () => {
    mockSelectResult.mockReturnValue([{ score: 30, incorrectAnswers: 1, timeTaken: 30 }]);

    await saveChallengeResult(validInput);

    // Only 2 inserts: challenge_results, challenge_best_scores (no feed_items)
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it('should insert feed_item when incorrectAnswers improves with same score', async () => {
    mockSelectResult.mockReturnValue([{ score: 25, incorrectAnswers: 5, timeTaken: 45 }]);

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(3);
  });

  it('should insert feed_item when timeTaken improves with same score and incorrectAnswers', async () => {
    mockSelectResult.mockReturnValue([{ score: 25, incorrectAnswers: 3, timeTaken: 60 }]);

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(3);
  });

  it('should NOT insert feed_item when all values are equal (no improvement)', async () => {
    mockSelectResult.mockReturnValue([{ score: 25, incorrectAnswers: 3, timeTaken: 45 }]);

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it('should call getUserAllTimeRank when improvement detected', async () => {
    mockSelectResult.mockReturnValue([]);

    await saveChallengeResult(validInput);

    expect(mockGetUserAllTimeRank).toHaveBeenCalledWith(
      validInput.userId,
      validInput.menuType,
      validInput.leaderboardKey
    );
  });

  it('should NOT call getUserAllTimeRank when no improvement', async () => {
    mockSelectResult.mockReturnValue([{ score: 30, incorrectAnswers: 1, timeTaken: 30 }]);

    await saveChallengeResult(validInput);

    expect(mockGetUserAllTimeRank).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Error propagation
  // -------------------------------------------------------------------------

  it('should propagate errors from the transaction', async () => {
    const { db } = await import('./index');
    const originalTransaction = db.transaction;
    db.transaction = vi.fn().mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(saveChallengeResult(validInput)).rejects.toThrow('DB connection lost');

    db.transaction = originalTransaction;
  });

  // -------------------------------------------------------------------------
  // Various input combinations
  // -------------------------------------------------------------------------

  it('should handle zero score and zero incorrect answers', async () => {
    const zeroInput: ChallengeResultInput = {
      ...validInput,
      score: 0,
      incorrectAnswers: 0,
      timeTaken: 1,
    };

    await saveChallengeResult(zeroInput);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenNthCalledWith(1, expect.objectContaining({ score: 0 }));
  });

  it('should handle large score values', async () => {
    const largeInput: ChallengeResultInput = {
      ...validInput,
      score: 999999,
      timeTaken: 3600,
    };

    await saveChallengeResult(largeInput);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenNthCalledWith(1, expect.objectContaining({ score: 999999 }));
  });

  it('should handle different menu types', async () => {
    const legalMovesInput: ChallengeResultInput = {
      ...validInput,
      menuType: 'legal_moves',
      leaderboardKey: 'knight',
    };

    await saveChallengeResult(legalMovesInput);

    expect(mockInsertValues).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        menuType: 'legal_moves',
        leaderboardKey: 'knight',
      })
    );
  });
});
