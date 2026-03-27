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
const mockExecute = vi.fn();

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
    execute: (...args: unknown[]) => mockExecute(...args),
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
    mockGetUserAllTimeRank.mockResolvedValue({ rank: 5 });
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

  it('should insert feed_item when user has no previous best score (new entry) and rank <= 10', async () => {
    mockSelectResult.mockReturnValue([]);
    mockGetUserAllTimeRank.mockResolvedValue({ rank: 5 });

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
          rank: 5,
        }),
      })
    );
  });

  it('should NOT include previousRank in metadata for new entries', async () => {
    mockSelectResult.mockReturnValue([]);
    mockGetUserAllTimeRank.mockResolvedValue({ rank: 3 });

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(3);
    const feedInsertArg = mockInsertValues.mock.calls[2][0];
    expect(feedInsertArg.metadata).not.toHaveProperty('previousRank');
  });

  it('should NOT insert feed_item when new entry has rank > 10', async () => {
    mockSelectResult.mockReturnValue([]);
    mockGetUserAllTimeRank.mockResolvedValue({ rank: 11 });

    await saveChallengeResult(validInput);

    // Only 2 inserts: challenge_results, challenge_best_scores (no feed_items)
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Feed item insertion on improvement with rank change
  // -------------------------------------------------------------------------

  it('should insert feed_item when score improves and rank goes up', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    // First call (old rank, before UPSERT): rank 8
    // Second call (new rank, after UPSERT): rank 5
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 8 }).mockResolvedValueOnce({ rank: 5 });

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(3);
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        entityType: 'challenge_rank_update',
        metadata: expect.objectContaining({
          isNewEntry: false,
          score: validInput.score,
          rank: 5,
          previousRank: 8,
        }),
      })
    );
  });

  it('should NOT insert feed_item when score improves but rank stays the same', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    // Old rank = 5, new rank = 5 (no change)
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 5 }).mockResolvedValueOnce({ rank: 5 });

    await saveChallengeResult(validInput);

    // Only 2 inserts: challenge_results, challenge_best_scores (no feed_items)
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it('should NOT insert feed_item when score improves but rank goes down', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    // Old rank = 5, new rank = 7 (rank decreased — others overtook)
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 5 }).mockResolvedValueOnce({ rank: 7 });

    await saveChallengeResult(validInput);

    // Only 2 inserts: challenge_results, challenge_best_scores (no feed_items)
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it('should NOT insert feed_item when score does not improve', async () => {
    mockSelectResult.mockReturnValue([{ score: 30, incorrectAnswers: 1, timeTaken: 30 }]);

    await saveChallengeResult(validInput);

    // Only 2 inserts: challenge_results, challenge_best_scores (no feed_items)
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it('should insert feed_item when incorrectAnswers improves with same score and rank goes up', async () => {
    mockSelectResult.mockReturnValue([{ score: 25, incorrectAnswers: 5, timeTaken: 45 }]);
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 7 }).mockResolvedValueOnce({ rank: 5 });

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(3);
  });

  it('should insert feed_item when timeTaken improves with same score and incorrectAnswers and rank goes up', async () => {
    mockSelectResult.mockReturnValue([{ score: 25, incorrectAnswers: 3, timeTaken: 60 }]);
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 6 }).mockResolvedValueOnce({ rank: 4 });

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(3);
  });

  it('should NOT insert feed_item when all values are equal (no improvement)', async () => {
    mockSelectResult.mockReturnValue([{ score: 25, incorrectAnswers: 3, timeTaken: 45 }]);

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // getUserAllTimeRank receives tx
  // -------------------------------------------------------------------------

  it('should call getUserAllTimeRank with tx for new entry', async () => {
    mockSelectResult.mockReturnValue([]);

    await saveChallengeResult(validInput);

    expect(mockGetUserAllTimeRank).toHaveBeenCalledWith(
      validInput.userId,
      validInput.menuType,
      validInput.leaderboardKey,
      expect.objectContaining({ execute: expect.any(Function) })
    );
  });

  it('should call getUserAllTimeRank with tx for improvement (called twice)', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 8 }).mockResolvedValueOnce({ rank: 5 });

    await saveChallengeResult(validInput);

    // Called twice: once before UPSERT (old rank), once after UPSERT (new rank)
    expect(mockGetUserAllTimeRank).toHaveBeenCalledTimes(2);
    expect(mockGetUserAllTimeRank).toHaveBeenNthCalledWith(
      1,
      validInput.userId,
      validInput.menuType,
      validInput.leaderboardKey,
      expect.objectContaining({ execute: expect.any(Function) })
    );
    expect(mockGetUserAllTimeRank).toHaveBeenNthCalledWith(
      2,
      validInput.userId,
      validInput.menuType,
      validInput.leaderboardKey,
      expect.objectContaining({ execute: expect.any(Function) })
    );
  });

  it('should NOT call getUserAllTimeRank when no improvement', async () => {
    mockSelectResult.mockReturnValue([{ score: 30, incorrectAnswers: 1, timeTaken: 30 }]);

    await saveChallengeResult(validInput);

    expect(mockGetUserAllTimeRank).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Bug fix: getUserAllTimeRank returns null
  // -------------------------------------------------------------------------

  it('should NOT insert feed_item when getUserAllTimeRank returns null for new entry', async () => {
    mockSelectResult.mockReturnValue([]);
    mockGetUserAllTimeRank.mockResolvedValue(null);

    await saveChallengeResult(validInput);

    // Only 2 inserts: challenge_results, challenge_best_scores (no feed_items)
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it('should NOT insert feed_item when getUserAllTimeRank returns null for improvement (old rank null)', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    // Old rank is null, new rank is valid
    mockGetUserAllTimeRank.mockResolvedValueOnce(null).mockResolvedValueOnce({ rank: 3 });

    await saveChallengeResult(validInput);

    // Only 2 inserts: no feed_items because oldRank is null
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it('should NOT insert feed_item when getUserAllTimeRank returns null for improvement (new rank null)', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    // Old rank is valid, new rank is null
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 8 }).mockResolvedValueOnce(null);

    await saveChallengeResult(validInput);

    // Only 2 inserts: no feed_items because newRank is null
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Improvement with rank > 10
  // -------------------------------------------------------------------------

  it('should NOT insert feed_item when improvement but new rank > 10', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 15 }).mockResolvedValueOnce({ rank: 12 });

    await saveChallengeResult(validInput);

    // Only 2 inserts: no feed_items because rank > 10
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
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

  // -------------------------------------------------------------------------
  // Additional edge cases (from Tester review)
  // -------------------------------------------------------------------------

  it('should insert feed_item when improvement and new rank is exactly 10 (boundary)', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    // oldRank=12, newRank=10 (enters top 10 boundary)
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 12 }).mockResolvedValueOnce({ rank: 10 });

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(3);
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        entityType: 'challenge_rank_update',
        metadata: expect.objectContaining({
          rank: 10,
          previousRank: 12,
        }),
      })
    );
  });

  it('should NOT insert feed_item when improvement and both oldRank and newRank are null', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    mockGetUserAllTimeRank.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it('should insert feed_item when getUserAllTimeRank returns rank 0 for new entry', async () => {
    mockSelectResult.mockReturnValue([]);
    mockGetUserAllTimeRank.mockResolvedValue({ rank: 0 });

    await saveChallengeResult(validInput);

    // rank 0 <= 10, so feed_item is inserted
    expect(mockInsertValues).toHaveBeenCalledTimes(3);
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        metadata: expect.objectContaining({ rank: 0 }),
      })
    );
  });

  it('should NOT insert feed_item when improvement but oldRank is within top 10 and newRank falls outside (rank demotion)', async () => {
    mockSelectResult.mockReturnValue([{ score: 20, incorrectAnswers: 5, timeTaken: 60 }]);
    // oldRank=5 (top 10), newRank=12 (fell out of top 10)
    mockGetUserAllTimeRank.mockResolvedValueOnce({ rank: 5 }).mockResolvedValueOnce({ rank: 12 });

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it('should set entityId to challengeResult.id in feed_item', async () => {
    mockSelectResult.mockReturnValue([]);
    mockGetUserAllTimeRank.mockResolvedValue({ rank: 3 });

    await saveChallengeResult(validInput);

    expect(mockInsertValues).toHaveBeenCalledTimes(3);
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        entityId: 'result-00000000-0000-0000-0000-000000000001',
      })
    );
  });

  it('should NOT insert feed_item when score is equal but incorrectAnswers worsened', async () => {
    // Same score, but incorrectAnswers increased (worsened): not an improvement
    mockSelectResult.mockReturnValue([{ score: 25, incorrectAnswers: 2, timeTaken: 45 }]);

    await saveChallengeResult(validInput); // input has incorrectAnswers: 3 (worse than 2)

    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });
});
