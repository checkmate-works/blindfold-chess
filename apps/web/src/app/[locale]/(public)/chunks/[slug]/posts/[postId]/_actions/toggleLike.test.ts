import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toggleLike } from './toggleLike';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockInsertValues = vi.fn();
const mockSelectCount = vi.fn();
const mockSelectPostAuthor = vi.fn();
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
            return mockSelectCount();
          },
        }),
      }),
    },
    topicPosts: topicPostsTable,
    likes: likesTable,
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

describe('chunks detail page toggleLike', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertValues.mockResolvedValue(undefined);
    mockSelectCount.mockResolvedValue([{ count: 1 }]);
    mockSelectPostAuthor.mockResolvedValue([{ userId: testPostAuthorId }]);
  });

  it('returns error when chunk slug does not exist', async () => {
    mockGetChunkBySlug.mockResolvedValue(null);
    const result = await toggleLike(testPostId, 'en', 'no-such-chunk');
    expect(result).toEqual({ error: 'invalidChunk' });
  });

  it('revalidates both the listing and the detail path so like counts stay in sync', async () => {
    await toggleLike(testPostId, 'en', testSlug);

    const calls = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(calls).toContain(`/en/chunks/${testSlug}`);
    expect(calls).toContain(`/en/chunks/${testSlug}/posts/${testPostId}`);
    expect(calls).not.toContain(`/en/topics/chunks/${testSlug}`);
  });
});
