import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { deleteOwnAccount } from './deleteOwnAccount';

const mockDeleteAccount = vi.fn();

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/users/delete-account', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}));

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit');

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

describe('deleteOwnAccount', () => {
  beforeEach(() => {
    mockDeleteAccount.mockResolvedValue({ ok: true });
  });

  describe('ban enforcement', () => {
    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await deleteOwnAccount();

      expect(result).toEqual({ error: 'banned' });
      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });
  });

  describe('rate limit enforcement', () => {
    it('should return rateLimited when rate limit is exceeded', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ error: 'rateLimited' } as never);

      const result = await deleteOwnAccount();

      expect(result).toEqual({ error: 'rateLimited' });
      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });
  });

  describe('normal case', () => {
    it('should delegate to deleteAccount and return success for authenticated user', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);

      const result = await deleteOwnAccount();

      expect(result).toEqual({ success: true });
      expect(mockDeleteAccount).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('error cases', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await deleteOwnAccount();

      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });

    it('should propagate the error code when deleteAccount fails', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      mockDeleteAccount.mockResolvedValue({ ok: false, error: 'failed_to_delete_auth_user' });

      const result = await deleteOwnAccount();

      expect(result).toEqual({ error: 'failed_to_delete_auth_user' });
    });
  });

  describe('edge cases', () => {
    it('should handle getUser returning an error object', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('session expired'),
      });

      const result = await deleteOwnAccount();

      expect(result).toEqual({ error: 'signInRequired' });
    });
  });
});
