import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { createReply } from './createReply';

const mockSelectFromWhere = vi.fn();
const mockSelectProfile = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockGetPositionById = vi.fn();

vi.mock('@/lib/moderation/block');

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: vi.fn(),
}));

vi.mock('@/lib/supabase/server');

const txInsert = () => ({
  values: (...args: unknown[]) => {
    mockInsertValues(...args);
    return {
      returning: () => mockInsertReturning(),
    };
  },
});

vi.mock('@/lib/db', () => {
  const profilesTable = { id: 'id' };

  return {
    db: {
      select: () => ({
        from: (table: unknown) => {
          // The auth guard's own-profile lookup selects from `profiles` with
          // `.where(...).limit(1)`; route it to mockSelectProfile so it never
          // consumes mockSelectFromWhere's queued results.
          if (table === profilesTable) {
            return {
              where: () => ({
                limit: () => mockSelectProfile(),
              }),
            };
          }
          return {
            where: (...args: unknown[]) => {
              mockSelectFromWhere(...args);
              return (
                mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]
                  ?.value ?? []
              );
            },
          };
        },
      }),
      insert: () => ({
        values: (...args: unknown[]) => {
          mockInsertValues(...args);
          return {
            returning: () => mockInsertReturning(),
          };
        },
      }),
      transaction: async (cb: (tx: { insert: typeof txInsert }) => Promise<unknown>) =>
        cb({ insert: txInsert }),
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
    profiles: profilesTable,
  };
});

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit');

vi.mock('next/navigation');

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
    mockGetPositionById.mockResolvedValue({ id: positionId, type: 'memory' });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
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

  it('returns profileRequired and does not insert when the user has no profile', async () => {
    mockSelectProfile.mockResolvedValue([]);

    const result = await createReply('en', positionId, validPostId, {}, makeFormData('a reply'));
    expect(result).toEqual({ error: 'profileRequired' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('redirects back to the parent page with #post-{newReplyId} anchor (Reddit-style inline tree)', async () => {
    await expect(
      createReply('ja', positionId, validPostId, {}, makeFormData('hi'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(vi.mocked(redirect)).toHaveBeenCalledWith(
      `/ja/practice/position-memory/${positionId}?toast=post_created#post-${generatedReplyId}`
    );
  });

  // No revalidation: the redirect above lands on the (dynamic) parent page,
  // which re-queries and shows the new reply in the tree.
  it('does not revalidate any path', async () => {
    await expect(
      createReply('en', positionId, validPostId, {}, makeFormData('hi'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
