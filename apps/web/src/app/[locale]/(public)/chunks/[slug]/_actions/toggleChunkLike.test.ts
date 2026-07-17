import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toggleChunkLike } from './toggleChunkLike';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockInsertValues = vi.fn();
const mockSelectCount = vi.fn();
const mockSelectPostAuthor = vi.fn();
const mockSelectProfile = vi.fn();
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

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    toggleLike: { action: 'toggle_like', maxAttempts: 50, windowMs: 86_400_000 },
  },
}));

vi.mock('@/lib/db', () => {
  const topicPostsTable = { id: 'id', userId: 'user_id' };
  const likesTable = { userId: 'user_id', targetType: 'target_type', targetId: 'target_id' };
  const profilesTable = { id: 'id' };

  return {
    db: {
      insert: () => ({
        values: mockInsertValues,
      }),
      delete: () => ({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            if (table === topicPostsTable) {
              return { limit: () => mockSelectPostAuthor() };
            }
            if (table === profilesTable) {
              return { limit: () => mockSelectProfile() };
            }
            return mockSelectCount();
          },
        }),
      }),
    },
    topicPosts: topicPostsTable,
    likes: likesTable,
    profiles: profilesTable,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/chunks/queries', () => ({
  getChunkBySlug: (slug: string) => mockGetChunkBySlug(slug),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testPostAuthorId = 'user-00000000-0000-0000-0000-000000000002';
const testPostId = '11111111-2222-3333-4444-555555555555';
const testSlug = 'rook-battery';

describe('toggleChunkLike', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertValues.mockResolvedValue(undefined);
    mockSelectCount.mockResolvedValue([{ count: 1 }]);
    mockSelectPostAuthor.mockResolvedValue([{ userId: testPostAuthorId }]);
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
  });

  it('returns error when chunk slug does not exist', async () => {
    mockGetChunkBySlug.mockResolvedValue(null);
    const result = await toggleChunkLike(testPostId, 'en', 'no-such-chunk');
    expect(result).toEqual({ error: 'invalidChunk' });
  });

  it('returns profileRequired when the signed-in user has no profiles row', async () => {
    mockSelectProfile.mockResolvedValue([]);
    const result = await toggleChunkLike(testPostId, 'en', testSlug);
    expect(result).toEqual({ error: 'profileRequired' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('toggles like and returns liked=true with count', async () => {
    const result = await toggleChunkLike(testPostId, 'en', testSlug);
    expect(result).toEqual({ liked: true, likeCount: 1 });
  });

  it('revalidates the chunks detail path, not /topics/...', async () => {
    await toggleChunkLike(testPostId, 'en', testSlug);
    expect(revalidatePath).toHaveBeenCalledWith(`/en/chunks/${testSlug}`);
    // Should NOT have been called with the legacy /topics/... path.
    const calls = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(calls).not.toContain(`/en/topics/chunks/${testSlug}`);
  });
});
