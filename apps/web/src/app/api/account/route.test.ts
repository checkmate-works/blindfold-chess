import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE } from './route';

const mockGetUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockIsUserBanned = vi.fn();

vi.mock('server-only', () => ({}));

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

vi.mock('@/lib/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
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

      const response = await DELETE();

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'banned' });
      expect(mockDeleteUser).not.toHaveBeenCalled();
      expect(mockWhere).not.toHaveBeenCalled();
    });
  });

  describe('normal case', () => {
    it('should delete account and return success for authenticated user', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      mockDeleteUser.mockResolvedValue({ error: null });

      const response = await DELETE();

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });

      // Verify auth user was soft-deleted
      expect(mockDeleteUser).toHaveBeenCalledWith(testUserId, true);

      // Verify profile was cleaned up
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe('error cases', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      });

      const response = await DELETE();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'unauthorized' });

      // Should not attempt to delete anything
      expect(mockDeleteUser).not.toHaveBeenCalled();
      expect(mockWhere).not.toHaveBeenCalled();
    });

    it('should return 500 when Supabase Admin deleteUser fails', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      mockDeleteUser.mockResolvedValue({
        error: new Error('Admin API error'),
      });

      const response = await DELETE();

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'failed_to_delete_auth_user' });

      // Should not update profile when auth deletion fails
      expect(mockWhere).not.toHaveBeenCalled();
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

      await DELETE();

      expect(callOrder).toEqual(['deleteUser', 'updateProfile']);
    });
  });

  describe('edge cases', () => {
    it('should handle getUser returning an error object', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('session expired'),
      });

      const response = await DELETE();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'unauthorized' });
    });
  });
});
