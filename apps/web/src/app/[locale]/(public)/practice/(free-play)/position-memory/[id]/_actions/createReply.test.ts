import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReply } from './createReply';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockIsUserBanned = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetPositionById = vi.fn();

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          mockSelectFromWhere(...args);
          return (
            mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]?.value ?? []
          );
        },
      }),
    }),
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          returning: () => mockInsertReturning(),
        };
      },
    }),
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    topicType: 'topic_type',
    topicKey: 'topic_key',
    parentId: 'parent_id',
    rootPostId: 'root_post_id',
    content: 'content',
    deletedAt: 'deleted_at',
    replyPermission: 'reply_permission',
  },
  userFollows: {
    id: 'id',
    followerId: 'follower_id',
    followingId: 'following_id',
  },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    createReply: { action: 'create_reply', maxAttempts: 20, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

vi.mock('@/lib/positions/queries', () => ({
  getPositionById: (params: { id: string; type: string }) => mockGetPositionById(params),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const validPostId = '00000000-0000-0000-0000-000000000010';
const generatedReplyId = 'reply-00000000-0000-0000-0000-000000000010';
const positionId = '00000000-0000-0000-0000-000000000099';

function makeFormData(content: string): FormData {
  const fd = new FormData();
  fd.set('content', content);
  return fd;
}

describe('position-memory parent-page createReply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPositionById.mockResolvedValue({ id: positionId, type: 'memory' });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockSelectFromWhere.mockReturnValue([
      { id: validPostId, userId: otherUserId, replyPermission: 'everyone' },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);
  });

  it('inserts reply with topicType=position_memory and topicKey=positionId', async () => {
    await expect(
      createReply('en', positionId, validPostId, {}, makeFormData('a reply'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        topicType: 'position_memory',
        topicKey: positionId,
        content: 'a reply',
      })
    );
  });

  it('redirects back to the parent page with #post-{newReplyId} anchor (Reddit-style inline tree)', async () => {
    await expect(
      createReply('ja', positionId, validPostId, {}, makeFormData('hi'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith(
      `/ja/practice/position-memory/${positionId}?toast=post_created#post-${generatedReplyId}`
    );
  });

  it('revalidates the parent page (not a per-comment detail path) so newly inserted replies appear in the tree', async () => {
    await expect(
      createReply('en', positionId, validPostId, {}, makeFormData('hi'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(revalidatePath).toHaveBeenCalledWith(`/en/practice/position-memory/${positionId}`);
  });
});
