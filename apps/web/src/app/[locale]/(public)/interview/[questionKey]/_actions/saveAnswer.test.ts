import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';

import { saveAnswerAction } from './saveAnswer';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateSet = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockExistingSelectFromWhereLimit = vi.fn();

vi.mock('@/lib/activity-log', () => ({
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

vi.mock('@/lib/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    saveInterviewAnswer: {
      action: 'save_interview_answer',
      maxAttempts: 50,
      windowMs: 86_400_000,
    },
  },
}));

let selectCallCount = 0;

vi.mock('@/lib/db', () => {
  const chessOpeningsTable = { slug: 'slug' };
  const userInterviewAnswersTable = {
    userId: 'user_id',
    questionKey: 'question_key',
    answerValue: 'answer_value',
    deletedAt: 'deleted_at',
  };

  return {
    db: {
      insert: () => ({
        values: mockInsertValues,
      }),
      update: () => ({
        set: (...args: unknown[]) => {
          mockUpdateSet(...args);
          return {
            where: () => Promise.resolve(),
          };
        },
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCallCount++;
              // First select call is for opening validation (master_ref),
              // Second select call is for existing answer check
              if (selectCallCount % 2 === 1) {
                return mockSelectFromWhere();
              }
              return mockExistingSelectFromWhereLimit();
            },
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
    selectCallCount = 0;
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
      expect(result).toEqual({ error: 'unauthorized' });
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
      mockSelectFromWhere.mockResolvedValue([]);

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
      mockSelectFromWhere.mockResolvedValue([{ slug: testAnswerValue }]);
    });

    it('should save answer and return success when no existing record', async () => {
      mockExistingSelectFromWhereLimit.mockResolvedValue([]);
      mockInsertValues.mockResolvedValue(undefined);

      const result = await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ success: true });
      expect(mockInsertValues).toHaveBeenCalled();
    });

    it('should return alreadyAnswered when active answer exists', async () => {
      mockExistingSelectFromWhereLimit.mockResolvedValue([{ deletedAt: null }]);

      const result = await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ error: 'alreadyAnswered' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should restore soft-deleted answer', async () => {
      mockExistingSelectFromWhereLimit.mockResolvedValue([{ deletedAt: new Date('2025-01-01') }]);

      const result = await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ success: true });
      expect(mockUpdateSet).toHaveBeenCalledWith({
        answerValue: testAnswerValue,
        deletedAt: null,
      });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('activity logging', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectFromWhere.mockResolvedValue([{ slug: testAnswerValue }]);
      mockExistingSelectFromWhereLimit.mockResolvedValue([]);
      mockInsertValues.mockResolvedValue(undefined);
    });

    it('should log activity event on successful save', async () => {
      await saveAnswerAction(testQuestionKey, testLocale, null, createFormData(testAnswerValue));

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'save_interview_answer',
        targetType: 'interview_answer',
        targetId: testQuestionKey,
        metadata: { answerValue: testAnswerValue },
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
          metadata: { answerValue: testAnswerValue },
        })
      );
    });
  });
});
