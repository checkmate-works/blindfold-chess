import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/users/activity-log';

import { saveAnswerAction } from './saveAnswer';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockInsertValuesReturning = vi.fn();
const mockSelectFromWhereLimit = vi.fn();

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    saveInterviewAnswer: {
      action: 'save_interview_answer',
      maxAttempts: 50,
      windowMs: 86_400_000,
    },
  },
}));

vi.mock('@/lib/db', () => {
  const chessOpeningsTable = { slug: 'slug' };
  const userInterviewAnswersTable = {
    id: 'id',
    userId: 'user_id',
    questionKey: 'question_key',
    answerValue: 'answer_value',
    deletedAt: 'deleted_at',
  };

  return {
    db: {
      insert: () => ({
        values: () => ({
          returning: () => mockInsertValuesReturning(),
        }),
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => mockSelectFromWhereLimit(),
          }),
        }),
      }),
    },
    chessOpenings: chessOpeningsTable,
    userInterviewAnswers: userInterviewAnswersTable,
  };
});

vi.mock('@/app/[locale]/_lib/interview', () => ({
  INTERVIEW_QUESTION_KEYS: ['favorite_opening'] as const,
  QUESTION_CONFIG: {
    favorite_opening: { answerType: 'master_ref' },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testInsertedId = '22222222-2222-2222-2222-222222222222';
const testQuestionKey = 'favorite_opening';
const testLocale = 'en';
const testAnswerValue = 'sicilian-defense';

function createFormData(answerValue: string | null): FormData {
  const formData = new FormData();
  if (answerValue !== null) {
    formData.set('answerValue', answerValue);
  }
  return formData;
}

describe('saveAnswerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should return unauthorized when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ error: 'signInRequired' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('ban enforcement', () => {
    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ error: 'banned' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should return invalidQuestionKey for unknown question key', async () => {
      const result = await saveAnswerAction(
        'unknown_key',
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ error: 'invalidQuestionKey' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should return invalidAnswerValue when answerValue is empty', async () => {
      const result = await saveAnswerAction(testQuestionKey, testLocale, null, createFormData(''));
      expect(result).toEqual({ error: 'invalidAnswerValue' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should return invalidAnswerValue when opening slug is not found', async () => {
      mockSelectFromWhereLimit.mockResolvedValue([]);

      const result = await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ error: 'invalidAnswerValue' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('save answer', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectFromWhereLimit.mockResolvedValue([{ slug: testAnswerValue }]);
    });

    it('should save answer and return success', async () => {
      mockInsertValuesReturning.mockResolvedValue([{ id: testInsertedId }]);

      const result = await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ success: true });
      expect(mockInsertValuesReturning).toHaveBeenCalled();
    });

    it('should return alreadyAnswered on unique violation', async () => {
      const uniqueError = new Error('unique_violation');
      (uniqueError as unknown as Record<string, unknown>).code = '23505';
      mockInsertValuesReturning.mockRejectedValue(uniqueError);

      const result = await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ error: 'alreadyAnswered' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should re-throw non-unique-violation errors', async () => {
      const otherError = new Error('connection_error');
      mockInsertValuesReturning.mockRejectedValue(otherError);

      await expect(
        saveAnswerAction(testQuestionKey, testLocale, null, createFormData(testAnswerValue))
      ).rejects.toThrow('connection_error');
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('activity logging', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectFromWhereLimit.mockResolvedValue([{ slug: testAnswerValue }]);
      mockInsertValuesReturning.mockResolvedValue([{ id: testInsertedId }]);
    });

    it('should log activity event on successful save', async () => {
      await saveAnswerAction(testQuestionKey, testLocale, null, createFormData(testAnswerValue));

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'save_interview_answer',
        targetType: 'interview_answer',
        targetId: testInsertedId,
        metadata: { questionKey: testQuestionKey, answerValue: testAnswerValue },
      });
    });

    it('should trim answerValue in metadata', async () => {
      await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(`  ${testAnswerValue}  `)
      );

      expect(logActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { questionKey: testQuestionKey, answerValue: testAnswerValue },
        })
      );
    });
  });
});
