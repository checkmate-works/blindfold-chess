import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';
import { logActivityEvent } from '@/lib/users/activity-log';

import { saveAnswerAction } from './saveAnswer';

const mockInsertValues = vi.fn();
const mockSelectFromWhereLimit = vi.fn();

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit');

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
        values: (...args: unknown[]) => mockInsertValues(...args),
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
      mockInsertValues.mockResolvedValue(undefined);

      const result = await saveAnswerAction(
        testQuestionKey,
        testLocale,
        null,
        createFormData(testAnswerValue)
      );
      expect(result).toEqual({ success: true });
      expect(mockInsertValues).toHaveBeenCalled();
      // Interview answers are a pure INSERT whose row survives in
      // user_interview_answers, so they are intentionally NOT recorded in the
      // activity log (the table is the durable record).
      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should return alreadyAnswered on unique violation', async () => {
      const uniqueError = new Error('unique_violation');
      (uniqueError as unknown as Record<string, unknown>).code = '23505';
      mockInsertValues.mockRejectedValue(uniqueError);

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
      mockInsertValues.mockRejectedValue(otherError);

      await expect(
        saveAnswerAction(testQuestionKey, testLocale, null, createFormData(testAnswerValue))
      ).rejects.toThrow('connection_error');
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });
});
