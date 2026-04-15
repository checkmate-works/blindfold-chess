import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/users/activity-log';

import { deleteAnswerAction } from './deleteAnswer';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockUpdateReturning = vi.fn();

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
    deleteInterviewAnswer: {
      action: 'delete_interview_answer',
      maxAttempts: 50,
      windowMs: 86_400_000,
    },
  },
}));

vi.mock('@/lib/db', () => {
  const userInterviewAnswersTable = {
    id: 'id',
    userId: 'user_id',
    questionKey: 'question_key',
    deletedAt: 'deleted_at',
  };

  return {
    db: {
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => mockUpdateReturning(),
          }),
        }),
      }),
    },
    userInterviewAnswers: userInterviewAnswersTable,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testAnswerId = '11111111-1111-1111-1111-111111111111';
const testQuestionKey = 'favorite_opening';
const testLocale = 'en';

describe('deleteAnswerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should return unauthorized when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await deleteAnswerAction(testAnswerId, testLocale);
      expect(result).toEqual({ error: 'signInRequired' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('ban enforcement', () => {
    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await deleteAnswerAction(testAnswerId, testLocale);
      expect(result).toEqual({ error: 'banned' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('delete answer', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should return notFound when no answer exists', async () => {
      mockUpdateReturning.mockResolvedValue([]);

      const result = await deleteAnswerAction(testAnswerId, testLocale);
      expect(result).toEqual({ error: 'notFound' });
      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should delete answer and return success', async () => {
      mockUpdateReturning.mockResolvedValue([{ id: testAnswerId, questionKey: testQuestionKey }]);

      const result = await deleteAnswerAction(testAnswerId, testLocale);
      expect(result).toEqual({ success: true });
    });
  });

  describe('activity logging', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockUpdateReturning.mockResolvedValue([{ id: testAnswerId, questionKey: testQuestionKey }]);
    });

    it('should log activity event on successful delete', async () => {
      await deleteAnswerAction(testAnswerId, testLocale);

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'delete_interview_answer',
        targetType: 'interview_answer',
        targetId: testAnswerId,
      });
    });
  });
});
