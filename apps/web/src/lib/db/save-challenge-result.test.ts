import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChallengeResultInput } from './save-challenge-result';
import { saveChallengeResult } from './save-challenge-result';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockInsertValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock('./index', () => {
  const makeDbOps = () => ({
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          onConflictDoUpdate: (...conflictArgs: unknown[]) => {
            mockOnConflictDoUpdate(...conflictArgs);
          },
        };
      },
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
  });

  // -------------------------------------------------------------------------
  // Transaction behavior (the fix under test)
  // -------------------------------------------------------------------------

  it('should use db.transaction to wrap both writes atomically', async () => {
    await saveChallengeResult(validInput);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('should perform two insert operations within the transaction', async () => {
    await saveChallengeResult(validInput);

    // First insert: challenge_results (append-only log)
    // Second insert: challenge_best_scores (upsert)
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
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
