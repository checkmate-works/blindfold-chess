import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReply } from './createReply';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockIsUserBanned = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetChunkBySlug = vi.fn();

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

describe('chunks detail page createReply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockSelectFromWhere.mockReturnValue([
      { id: validPostId, userId: otherUserId, replyPermission: 'everyone' },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);
  });

  it('returns error when chunk slug does not exist', async () => {
    mockGetChunkBySlug.mockResolvedValue(null);

    const result = await createReply('en', 'no-such-chunk', validPostId, {}, makeFormData('hi'));
    expect(result).toEqual({ error: 'Invalid chunk' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('inserts reply with topicType=chunk and topicKey=slug', async () => {
    await expect(
      createReply('en', testSlug, validPostId, {}, makeFormData('a reply'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        topicType: 'chunk',
        topicKey: testSlug,
        content: 'a reply',
      })
    );
  });

  it('redirects back to the same detail page (not the listing) so the user stays in context', async () => {
    await expect(createReply('ja', testSlug, validPostId, {}, makeFormData('hi'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(mockRedirect).toHaveBeenCalledWith(
      `/ja/chunks/${testSlug}/posts/${validPostId}?toast=post_created`
    );
  });

  it('revalidates the detail path so newly inserted replies appear', async () => {
    await expect(createReply('en', testSlug, validPostId, {}, makeFormData('hi'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(revalidatePath).toHaveBeenCalledWith(`/en/chunks/${testSlug}/posts/${validPostId}`);
  });

  it('returns postNotFound when the parent post is soft-deleted (no row returned by the deletedAt-filtered query)', async () => {
    // The createReplyBase top-level lookup is `WHERE id=postId AND deletedAt IS NULL`.
    // When the parent is soft-deleted the query yields no rows, and the action
    // must surface that as 'postNotFound' rather than inserting an orphan reply.
    mockSelectFromWhere.mockReturnValue([]);

    const result = await createReply('en', testSlug, validPostId, {}, makeFormData('hi'));
    expect(result).toEqual({ error: 'postNotFound' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('rejects an invalid (non-UUID) postId before touching the DB', async () => {
    // UUID_RE validation happens before the parent lookup, so a malformed
    // postId from a tampered URL must short-circuit with 'invalidPostId'.
    const result = await createReply('en', testSlug, 'not-a-uuid', {}, makeFormData('hi'));
    expect(result).toEqual({ error: 'invalidPostId' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});
