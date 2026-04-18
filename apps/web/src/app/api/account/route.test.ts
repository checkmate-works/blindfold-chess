import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit } from '@/lib/security/rate-limit';

import { DELETE } from './route';

const mockGetUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockLogActivityEvent = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/csrf', () => ({
  isValidOrigin: () => true,
}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuardApi: async (rateLimitConfig: {
    action: string;
    maxAttempts: number;
    windowMs: number;
  }) => {
    const { createClient } = await import('@/lib/supabase/server');
    const { isUserBanned } = await import('@/lib/moderation/ban');
    const { checkRateLimit } = await import('@/lib/security/rate-limit');
    const { NextResponse } = await import('next/server');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
    }

    if (await isUserBanned(user.id)) {
      return { response: NextResponse.json({ error: 'banned' }, { status: 403 }) };
    }

    const rateLimitResult = await checkRateLimit(user.id, rateLimitConfig);
    if ('error' in rateLimitResult) {
      return { response: NextResponse.json({ error: 'rateLimited' }, { status: 429 }) };
    }

    return { user };
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
      },
    },
  }),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    deleteAccount: { action: 'delete_account', maxAttempts: 3, windowMs: 3_600_000 },
  },
}));

const mockWhere = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/db', () => ({
  db: {
    update: () => ({
      set: () => ({
        where: mockWhere,
      }),
    }),
  },
  profiles: {
    id: 'id',
    displayName: 'display_name',
    avatarUrl: 'avatar_url',
    bio: 'bio',
    country: 'country',
    flair: 'flair',
    fideId: 'fide_id',
    chesscomUsername: 'chesscom_username',
    lichessUsername: 'lichess_username',
    deletedAt: 'deleted_at',
    updatedAt: 'updated_at',
  },
}));

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

function createDeleteRequest(): Request {
  return new Request('https://example.com/api/account', {
    method: 'DELETE',
    headers: { origin: 'https://example.com' },
  });
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ban enforcement', () => {
    it('should return 403 when user is banned', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(true);

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'banned' });
      expect(mockDeleteUser).not.toHaveBeenCalled();
      expect(mockWhere).not.toHaveBeenCalled();
    });

    it('should not log activity event when user is banned', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(true);

      await DELETE(createDeleteRequest());

      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('rate limit enforcement', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ error: 'rateLimited' } as never);

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body).toEqual({ error: 'rateLimited' });
    });

    it('should not log activity event when rate limited', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ error: 'rateLimited' } as never);

      await DELETE(createDeleteRequest());

      expect(mockLogActivityEvent).not.toHaveBeenCalled();
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });

  describe('normal case', () => {
    it('should delete account and return success for authenticated user', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      mockDeleteUser.mockResolvedValue({ error: null });

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });

      // Verify auth user was soft-deleted
      expect(mockDeleteUser).toHaveBeenCalledWith(testUserId, true);

      // Verify profile was cleaned up
      expect(mockWhere).toHaveBeenCalled();

      // Verify activity log was recorded
      expect(mockLogActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'delete_account',
        targetType: 'user',
        targetId: testUserId,
      });
    });
  });

  describe('error cases', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      });

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'unauthorized' });

      // Should not attempt to delete anything
      expect(mockDeleteUser).not.toHaveBeenCalled();
      expect(mockWhere).not.toHaveBeenCalled();
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });

    it('should return 500 when Supabase Admin deleteUser fails', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      mockDeleteUser.mockResolvedValue({
        error: new Error('Admin API error'),
      });

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'failed_to_delete_auth_user' });

      // Should not update profile when auth deletion fails
      expect(mockWhere).not.toHaveBeenCalled();
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('operation order', () => {
    it('should delete auth user before updating profile', async () => {
      const callOrder: string[] = [];

      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      mockDeleteUser.mockImplementation(async () => {
        callOrder.push('deleteUser');
        return { error: null };
      });
      mockWhere.mockImplementation(async () => {
        callOrder.push('updateProfile');
        return undefined;
      });

      await DELETE(createDeleteRequest());

      expect(callOrder).toEqual(['deleteUser', 'updateProfile']);
    });
  });

  describe('edge cases', () => {
    it('should handle getUser returning an error object', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('session expired'),
      });

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'unauthorized' });
    });
  });
});
