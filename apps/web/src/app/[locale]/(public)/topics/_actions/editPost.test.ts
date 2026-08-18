import { describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/users/activity-log';

import { editPost } from './editPost';

const mockGetUser = vi.fn();
// Both the `select(post)` and the (no-op-path) `select(updatedAt)` chains
// land here. Tests queue up rows for whichever call they trigger.
const mockSelectFromWhereLimit = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockIsUserBanned = vi.fn();

vi.mock('@/lib/users/activity-log');

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
        where: () => ({
          limit: () => mockSelectFromWhereLimit(),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: mockUpdateSetWhere,
      }),
    }),
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    topicType: 'topic_type',
    topicKey: 'topic_key',
    content: 'content',
    isSpoiler: 'is_spoiler',
    deletedAt: 'deleted_at',
    updatedAt: 'updated_at',
  },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    editPost: { action: 'edit_post', maxAttempts: 30, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const testPostId = 'post-00000000-0000-0000-0000-000000000001';

function makeFormData(content: string, isSpoiler?: 'on' | undefined): FormData {
  const fd = new FormData();
  fd.set('content', content);
  if (isSpoiler !== undefined) fd.set('isSpoiler', isSpoiler);
  return fd;
}

describe('editPost', () => {
  it('should return signInRequired when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await editPost(testPostId, 'en', makeFormData('hello'));
    expect(result).toEqual({ error: 'signInRequired' });
  });

  it('should return banned when user is banned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(true);

    const result = await editPost(testPostId, 'en', makeFormData('hello'));
    expect(result).toEqual({ error: 'banned' });
    expect(mockSelectFromWhereLimit).not.toHaveBeenCalled();
  });

  it('should return notFound when post does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValueOnce([]);

    const result = await editPost(testPostId, 'en', makeFormData('hello'));
    expect(result).toEqual({ error: 'notFound' });
  });

  it('should return unauthorized when user is not the post owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValueOnce([
      {
        id: testPostId,
        userId: otherUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        content: 'original',
        isSpoiler: false,
        deletedAt: null,
      },
    ]);

    const result = await editPost(testPostId, 'en', makeFormData('hello'));
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
  });

  it('should return alreadyDeleted for soft-deleted posts', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValueOnce([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        content: 'original',
        isSpoiler: false,
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const result = await editPost(testPostId, 'en', makeFormData('hello'));
    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
  });

  it('should return contentRequired when content is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValueOnce([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        content: 'original',
        isSpoiler: false,
        deletedAt: null,
      },
    ]);

    const result = await editPost(testPostId, 'en', makeFormData('   '));
    expect(result).toEqual({ error: 'contentRequired' });
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
  });

  it('should update content for own post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValueOnce([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        content: 'original',
        isSpoiler: false,
        deletedAt: null,
      },
    ]);

    const result = await editPost(testPostId, 'en', makeFormData('updated content'));
    expect('success' in result && result.success).toBe(true);
    if ('success' in result) {
      expect(result.content).toBe('updated content');
      expect(result.isSpoiler).toBe(false);
      expect(result.updatedAt).toBeInstanceOf(Date);
    }
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it('should accept isSpoiler toggle for position_puzzle topic type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValueOnce([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'position_puzzle',
        topicKey: 'puzzle-id',
        content: 'original',
        isSpoiler: false,
        deletedAt: null,
      },
    ]);

    const result = await editPost(testPostId, 'en', makeFormData('original', 'on'));
    expect('success' in result && result.success).toBe(true);
    if ('success' in result) {
      expect(result.isSpoiler).toBe(true);
    }
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it('should ignore isSpoiler for non-puzzle topic types', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValueOnce([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        content: 'original',
        isSpoiler: false,
        deletedAt: null,
      },
    ]);

    // Hand-crafted FormData attempts to flip the flag — must be ignored
    // because the UI never surfaces isSpoiler for openings.
    const result = await editPost(testPostId, 'en', makeFormData('updated', 'on'));
    expect('success' in result && result.success).toBe(true);
    if ('success' in result) {
      expect(result.isSpoiler).toBe(false);
    }
  });

  it('should skip the UPDATE when neither content nor spoiler changed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    const existingUpdatedAt = new Date('2026-04-01T10:00:00Z');
    mockSelectFromWhereLimit
      .mockResolvedValueOnce([
        {
          id: testPostId,
          userId: testUserId,
          topicType: 'opening',
          topicKey: 'sicilian-defense',
          content: 'unchanged',
          isSpoiler: false,
          deletedAt: null,
        },
      ])
      // Second call: readUpdatedAt
      .mockResolvedValueOnce([{ updatedAt: existingUpdatedAt }]);

    const result = await editPost(testPostId, 'en', makeFormData('unchanged'));
    expect('success' in result && result.success).toBe(true);
    if ('success' in result) {
      expect(result.updatedAt).toEqual(existingUpdatedAt);
    }
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
    expect(logActivityEvent).not.toHaveBeenCalled();
  });

  it('should log activity event on successful edit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValueOnce([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        content: 'original',
        isSpoiler: false,
        deletedAt: null,
      },
    ]);

    await editPost(testPostId, 'en', makeFormData('updated'));
    // An edit overwrites content in place with no revision history, so the
    // activity log preserves the overwritten value (old → new). Only the
    // changed field is recorded.
    expect(logActivityEvent).toHaveBeenCalledWith({
      userId: testUserId,
      action: 'edit_post',
      targetType: 'topic_post',
      targetId: testPostId,
      metadata: {
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        changes: { content: { from: 'original', to: 'updated' } },
      },
    });
  });
});
