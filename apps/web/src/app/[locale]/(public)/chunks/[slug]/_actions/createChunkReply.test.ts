import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';
import { logActivityEvent } from '@/lib/users/activity-log';

import { createChunkReply } from './createChunkReply';

const mockSelectFromWhere = vi.fn();
const mockSelectProfile = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetChunkBySlug = vi.fn();

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
  const profilesTable = {
    id: 'id',
  };

  return {
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: (...args: unknown[]) => {
            if (table === profilesTable) {
              return { limit: () => mockSelectProfile() };
            }
            mockSelectFromWhere(...args);
            return (
              mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]?.value ??
              []
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

vi.mock('@/lib/chunks/queries', () => ({
  getChunkBySlug: (slug: string) => mockGetChunkBySlug(slug),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const validPostId = '00000000-0000-0000-0000-000000000001';
const generatedReplyId = 'reply-00000000-0000-0000-0000-000000000001';
const testSlug = 'rook-battery';

function makeFormData(content: string): FormData {
  const fd = new FormData();
  fd.set('content', content);
  return fd;
}

describe('createChunkReply', () => {
  beforeEach(() => {
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
    mockSelectFromWhere.mockReturnValue([
      { id: validPostId, userId: otherUserId, replyPermission: 'everyone' },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);
  });

  it('returns error when chunk slug does not exist', async () => {
    mockGetChunkBySlug.mockResolvedValue(null);

    const result = await createChunkReply(
      'en',
      'no-such-chunk',
      validPostId,
      {},
      makeFormData('hi')
    );
    expect(result).toEqual({ error: 'Invalid chunk' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('inserts reply with topicType=chunk and topicKey=slug', async () => {
    await expect(
      createChunkReply('en', testSlug, validPostId, {}, makeFormData('a reply'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        topicType: 'chunk',
        topicKey: testSlug,
        content: 'a reply',
      })
    );
  });

  it('redirects to /{locale}/chunks/{slug}#post-{replyId}', async () => {
    await expect(
      createChunkReply('ja', testSlug, validPostId, {}, makeFormData('hi'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith(
      `/ja/chunks/${testSlug}?toast=post_created#post-${generatedReplyId}`
    );
  });

  // No revalidation: the redirect above already lands on the (dynamic) chunk
  // page, which re-queries and shows the new reply.
  it('does not revalidate any path', async () => {
    await expect(
      createChunkReply('en', testSlug, validPostId, {}, makeFormData('hi'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('does not write an activity-log row (the topic_post reply row is the record)', async () => {
    await expect(
      createChunkReply('en', testSlug, validPostId, {}, makeFormData('hi'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(logActivityEvent).not.toHaveBeenCalled();
  });

  it('returns postNotFound when the parent post is soft-deleted', async () => {
    // The shared createReplyBase WHERE clause includes `deletedAt IS NULL`,
    // so a soft-deleted parent must surface as 'postNotFound' to the caller.
    mockSelectFromWhere.mockReturnValue([]);

    const result = await createChunkReply('en', testSlug, validPostId, {}, makeFormData('hi'));
    expect(result).toEqual({ error: 'postNotFound' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns profileRequired when the signed-in user has no profiles row', async () => {
    mockSelectProfile.mockResolvedValue([]);

    const result = await createChunkReply('en', testSlug, validPostId, {}, makeFormData('hi'));
    expect(result).toEqual({ error: 'profileRequired' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('rejects an invalid (non-UUID) postId before touching the DB', async () => {
    const result = await createChunkReply('en', testSlug, 'not-a-uuid', {}, makeFormData('hi'));
    expect(result).toEqual({ error: 'invalidPostId' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});
