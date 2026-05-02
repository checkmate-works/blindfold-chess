import { revalidateTag } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/users/activity-log';
import { applyAutomatedGrant } from '@/lib/users/user-grants';

import { createPositionPuzzlePost } from './createPositionPuzzlePost';

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
const testPositionId = 'pos-00000000-0000-0000-0000-000000000def';

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

describe('createPositionPuzzlePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPositionById.mockResolvedValue({ id: testPositionId, type: 'puzzle' });
  });

  describe('position validation', () => {
    it('returns error when the position does not exist or is not a puzzle position', async () => {
      mockGetPositionById.mockResolvedValue(null);

      const result = await createPositionPuzzlePost(
        'en',
        testPositionId,
        {},
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'Invalid position' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('queries getPositionById with type "puzzle"', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);

      await expect(
        createPositionPuzzlePost('en', testPositionId, {}, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockGetPositionById).toHaveBeenCalledWith({ id: testPositionId, type: 'puzzle' });
    });
  });

  describe('isSpoiler handling', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    });

    it('inserts isSpoiler=false when the form omits the field', async () => {
      await expect(
        createPositionPuzzlePost('en', testPositionId, {}, makeFormData('Try Nf3'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'position_puzzle',
        topicKey: testPositionId,
        content: 'Try Nf3',
        replyPermission: 'everyone',
        isSpoiler: false,
      });
    });

    it('inserts isSpoiler=true when the checkbox submits "on"', async () => {
      await expect(
        createPositionPuzzlePost(
          'en',
          testPositionId,
          {},
          makeFormData('Spoiler text', { isSpoiler: 'on' })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ isSpoiler: true, topicType: 'position_puzzle' })
      );
    });

    it('inserts isSpoiler=true when the checkbox submits "true"', async () => {
      // The action accepts both 'on' (default browser checkbox value) and
      // 'true' to remain robust against form helpers that normalize the
      // checkbox payload.
      await expect(
        createPositionPuzzlePost(
          'en',
          testPositionId,
          {},
          makeFormData('Spoiler text', { isSpoiler: 'true' })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ isSpoiler: true, topicType: 'position_puzzle' })
      );
    });

    it('treats empty string isSpoiler as false', async () => {
      await expect(
        createPositionPuzzlePost(
          'en',
          testPositionId,
          {},
          makeFormData('Spoiler text', { isSpoiler: '' })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ isSpoiler: false }));
    });

    it('treats unrecognized isSpoiler values as false (defensive default)', async () => {
      await expect(
        createPositionPuzzlePost(
          'en',
          testPositionId,
          {},
          makeFormData('Spoiler text', { isSpoiler: 'maybe' })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ isSpoiler: false }));
    });
  });

  describe('post-creation side effects', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    });

    it('redirects through /thanks with the post URL as returnUrl', async () => {
      await expect(
        createPositionPuzzlePost('ja', testPositionId, {}, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');

      // Text-bearing puzzle comments trigger an automated grant; the toast is
      // suppressed because the user is routed through /thanks instead.
      const returnUrl = `/ja/practice/puzzle/${testPositionId}#post-${generatedPostId}`;
      expect(mockRedirect).toHaveBeenCalledWith(
        `/ja/thanks?grantId=g1&returnUrl=${encodeURIComponent(returnUrl)}`
      );
    });

    it('applies an automated topic_post grant for text-bearing puzzle comments', async () => {
      await expect(
        createPositionPuzzlePost('en', testPositionId, {}, makeFormData('comment'))
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
        createPositionPuzzlePost('en', testPositionId, {}, makeFormData('comment'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledTimes(1);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ topicType: 'position_puzzle' })
      );
    });

    it('logs a create_post activity event with topicType=position_puzzle', async () => {
      await expect(
        createPositionPuzzlePost('en', testPositionId, {}, makeFormData('comment'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'create_post',
        targetType: 'topic_post',
        targetId: generatedPostId,
        metadata: { topicType: 'position_puzzle', topicKey: testPositionId },
      });
    });
  });
});
