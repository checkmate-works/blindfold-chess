import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';

import { deletePost } from './deletePost';

const mockGetUser = vi.fn();
const mockSelectFromWhereLimit = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockIsUserBanned = vi.fn();

vi.mock('@/lib/activity-log', () => ({
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
    deletedAt: 'deleted_at',
  },
}));

vi.mock('@/lib/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    deletePost: { action: 'delete_post', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const testPostId = 'post-00000000-0000-0000-0000-000000000001';

describe('deletePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return banned when user is banned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(true);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'banned' });
    expect(mockSelectFromWhereLimit).not.toHaveBeenCalled();
  });

  it('should return notFound when post does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([]);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'notFound' });
  });

  it('should return unauthorized when user is not the post owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([
      {
        id: testPostId,
        userId: otherUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        deletedAt: null,
      },
    ]);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return alreadyDeleted when post is already soft-deleted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
  });

  it('should successfully soft-delete own post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        deletedAt: null,
      },
    ]);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ success: true });
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it('should log activity event on successful deletion', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        deletedAt: null,
      },
    ]);

    await deletePost(testPostId, 'en');
    expect(logActivityEvent).toHaveBeenCalledWith({
      userId: testUserId,
      action: 'delete_post',
      targetType: 'topic_post',
      targetId: testPostId,
      metadata: { topicType: 'opening', topicKey: 'sicilian-defense' },
    });
  });

  it('should not log activity event when deletion fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([]);

    await deletePost(testPostId, 'en');
    expect(logActivityEvent).not.toHaveBeenCalled();
  });
});
