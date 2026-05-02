import { revalidateTag } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/users/activity-log';
import { applyAutomatedGrant } from '@/lib/users/user-grants';

import { createPositionMemoryPost } from './createPositionMemoryPost';

const mockGetUser = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockIsUserBanned = vi.fn();
const mockGetPositionById = vi.fn();

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

const mockNotifyFollowersOfNewPost = vi.fn();
const mockCreateNotification = vi.fn();
vi.mock('@/lib/notifications/notification', () => ({
  notifyFollowersOfNewPost: (...args: unknown[]) => mockNotifyFollowersOfNewPost(...args),
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

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
  },
  topicPosts: {
    id: 'id',
  },
  feedItems: {},
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

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

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/users/user-grants', () => ({
  applyAutomatedGrant: vi.fn().mockResolvedValue({ grantId: 'g1', expiresAt: new Date() }),
}));

vi.mock('@/lib/positions/queries', () => ({
  getPositionById: (args: { id: string; type?: string }) => mockGetPositionById(args),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testPositionId = 'pos-00000000-0000-0000-0000-000000000abc';

function makeFormData(
  content: string,
  options: { replyPermission?: string; isSpoiler?: string } = {}
): FormData {
  const { replyPermission = 'everyone', isSpoiler } = options;
  const fd = new FormData();
  fd.set('content', content);
  fd.set('replyPermission', replyPermission);
  if (isSpoiler !== undefined) {
    fd.set('isSpoiler', isSpoiler);
  }
  return fd;
}

describe('createPositionMemoryPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPositionById.mockResolvedValue({ id: testPositionId, type: 'memory' });
  });

  describe('position validation', () => {
    it('returns error when the position does not exist or is not a memory position', async () => {
      mockGetPositionById.mockResolvedValue(null);

      const result = await createPositionMemoryPost(
        'en',
        testPositionId,
        {},
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'Invalid position' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('queries getPositionById with type "memory"', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);

      await expect(
        createPositionMemoryPost('en', testPositionId, {}, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockGetPositionById).toHaveBeenCalledWith({ id: testPositionId, type: 'memory' });
    });
  });

  describe('successful comment creation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    });

    it('inserts post with topicType=position_memory and topicKey=positionId', async () => {
      await expect(
        createPositionMemoryPost('en', testPositionId, {}, makeFormData('Nice problem'))
      ).rejects.toThrow('NEXT_REDIRECT');

      // The memory wrapper does NOT pass `isSpoiler`, so the column falls
      // back to the DB default (false). Assert the spread of the optional
      // property is absent from the insert payload.
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'position_memory',
        topicKey: testPositionId,
        content: 'Nice problem',
        replyPermission: 'everyone',
      });
    });

    it('redirects through /thanks with the post URL as returnUrl', async () => {
      await expect(
        createPositionMemoryPost('ja', testPositionId, {}, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');

      // Text-bearing memory comments trigger an automated grant; the toast is
      // suppressed because the user is routed through /thanks instead.
      const returnUrl = `/ja/practice/position-memory/${testPositionId}#post-${generatedPostId}`;
      expect(mockRedirect).toHaveBeenCalledWith(
        `/ja/thanks?grantId=g1&returnUrl=${encodeURIComponent(returnUrl)}`
      );
    });

    it('applies an automated topic_post grant for text-bearing memory comments', async () => {
      await expect(
        createPositionMemoryPost('en', testPositionId, {}, makeFormData('comment'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(applyAutomatedGrant).toHaveBeenCalledTimes(1);
      expect(applyAutomatedGrant).toHaveBeenCalledWith(
        expect.anything(),
        testUserId,
        'topic_post',
        { type: 'topic_post', id: generatedPostId }
      );
      expect(revalidateTag).toHaveBeenCalledWith('grant-status', { expire: 60 });
    });

    it('does NOT emit a feed_items row', async () => {
      await expect(
        createPositionMemoryPost('en', testPositionId, {}, makeFormData('comment'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledTimes(1);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ topicType: 'position_memory' })
      );
    });

    it('logs a create_post activity event with topicType=position_memory', async () => {
      await expect(
        createPositionMemoryPost('en', testPositionId, {}, makeFormData('comment'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'create_post',
        targetType: 'topic_post',
        targetId: generatedPostId,
        metadata: { topicType: 'position_memory', topicKey: testPositionId },
      });
    });
  });

  describe('isSpoiler forgery defense', () => {
    // Memory has no spoiler UI — the wrapper deliberately does not read the
    // 'isSpoiler' field, and createPostBase only spreads `isSpoiler` when the
    // wrapper passes a defined boolean. A forged or repurposed FormData
    // posting `isSpoiler: 'on'` must therefore be silently ignored, never
    // surfacing as a true value in the insert payload.
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    });

    it('ignores a forged isSpoiler="on" form value (memory has no spoiler UI)', async () => {
      await expect(
        createPositionMemoryPost(
          'en',
          testPositionId,
          {},
          makeFormData('comment', { isSpoiler: 'on' })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      // Wrapper never reads 'isSpoiler' → createPostBase receives `undefined`
      // → the spread `...(isSpoiler !== undefined ? { isSpoiler } : {})`
      // omits the field entirely, leaving the column at its DB default.
      const insertPayload = mockInsertValues.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(insertPayload).toBeDefined();
      expect(insertPayload).not.toHaveProperty('isSpoiler');
    });

    it('ignores a forged isSpoiler="true" form value', async () => {
      await expect(
        createPositionMemoryPost(
          'en',
          testPositionId,
          {},
          makeFormData('comment', { isSpoiler: 'true' })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      const insertPayload = mockInsertValues.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(insertPayload).toBeDefined();
      expect(insertPayload).not.toHaveProperty('isSpoiler');
    });
  });
});
