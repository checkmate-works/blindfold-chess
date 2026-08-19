import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { grantPointsForPost } from '@/lib/points';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';
import { logActivityEvent } from '@/lib/users/activity-log';

import { createChunkPost } from './createChunkPost';

const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockGetChunkBySlug = vi.fn();
const mockSelectProfile = vi.fn();

vi.mock('@/lib/moderation/block');

vi.mock('@/lib/users/activity-log');

const mockNotifyFollowersOfNewPost = vi.fn();
const mockCreateNotification = vi.fn();
vi.mock('@/lib/notifications/notification', () => ({
  notifyFollowersOfNewPost: (...args: unknown[]) => mockNotifyFollowersOfNewPost(...args),
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('@/lib/supabase/server');

const generatedPostId = 'post-00000000-0000-0000-0000-000000000001';

const mockTx = {
  insert: () => ({
    values: (...args: unknown[]) => {
      mockInsertValues(...args);
      return {
        returning: () => mockInsertReturning(),
      };
    },
  }),
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectProfile(),
        }),
      }),
    }),
  },
  topicPosts: {
    id: 'id',
  },
  profiles: {
    id: 'id',
  },
  feedItems: {},
}));

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    createPost: { action: 'create_post', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

vi.mock('@/lib/points', () => ({
  grantPointsForPost: vi.fn().mockResolvedValue({ pointEventId: 'pe-1', amount: 3 }),
  clawbackPointsForPost: vi.fn().mockResolvedValue(undefined),
  isPointEligibleTopicType: (v: string) => v === 'square' || v === 'opening',
  POST_CREATION_POINTS: 3,
}));

vi.mock('@/lib/chunks/queries', () => ({
  getChunkBySlug: (slug: string) => mockGetChunkBySlug(slug),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testSlug = 'rook-battery';

function makeFormData(content: string, replyPermission: string = 'everyone'): FormData {
  const fd = new FormData();
  fd.set('content', content);
  fd.set('replyPermission', replyPermission);
  return fd;
}

describe('createChunkPost', () => {
  beforeEach(() => {
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
  });

  describe('chunk validation', () => {
    it('should return error for non-existent chunk slug', async () => {
      mockGetChunkBySlug.mockResolvedValue(null);

      const result = await createChunkPost('en', 'no-such-chunk', {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid chunk' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('profile requirement', () => {
    it('should return error for an authenticated, non-banned user without a profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectProfile.mockResolvedValue([]);

      const result = await createChunkPost('en', testSlug, {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'profileRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('successful comment creation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    });

    it('should insert post with topicType=chunk and topicKey=slug', async () => {
      await expect(
        createChunkPost('en', testSlug, {}, makeFormData('Great pattern'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'chunk',
        topicKey: testSlug,
        content: 'Great pattern',
        replyPermission: 'everyone',
      });
    });

    it('should redirect to /{locale}/chunks/{slug}#post-{id}', async () => {
      await expect(createChunkPost('ja', testSlug, {}, makeFormData('hello'))).rejects.toThrow(
        'NEXT_REDIRECT'
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        `/ja/chunks/${testSlug}?toast=post_created#post-${generatedPostId}`
      );
    });
  });

  describe('grant policy (chunks should not earn points)', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    });

    it('should NOT call grantPointsForPost for chunk posts', async () => {
      await expect(createChunkPost('en', testSlug, {}, makeFormData('Nice chunk'))).rejects.toThrow(
        'NEXT_REDIRECT'
      );

      expect(grantPointsForPost).not.toHaveBeenCalled();
    });
  });

  describe('feed_items emission', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    });

    it('should NOT emit a feed_items row for chunk posts', async () => {
      await expect(createChunkPost('en', testSlug, {}, makeFormData('hello'))).rejects.toThrow(
        'NEXT_REDIRECT'
      );

      // Only the topic_posts insert is expected; the feed_items insert is skipped.
      expect(mockInsertValues).toHaveBeenCalledTimes(1);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ topicType: 'chunk' })
      );
    });
  });

  describe('activity logging', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    });

    it('should not log an activity event (the topic_post row is the record)', async () => {
      await expect(createChunkPost('en', testSlug, {}, makeFormData('hello'))).rejects.toThrow(
        'NEXT_REDIRECT'
      );

      // A post is a pure INSERT whose row survives in topic_posts, so it is
      // intentionally not duplicated into the activity log.
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });
});
