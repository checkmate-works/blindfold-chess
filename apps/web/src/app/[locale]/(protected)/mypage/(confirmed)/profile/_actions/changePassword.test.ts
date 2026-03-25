import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit } from '@/lib/rate-limit';

import { changePassword } from './changePassword';

const mockGetAuthenticatedUser = vi.fn();
const mockLogActivityEvent = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpdateUserById = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}));

vi.mock('@/lib/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    changePassword: { action: 'change_password', maxAttempts: 5, windowMs: 3_600_000 },
  },
}));

vi.mock('@/lib/validations/password', () => ({
  getPasswordValidationError: (password: string) => {
    if (password.length < 8) return 'tooShort';
    return null;
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      },
    },
  }),
}));

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

const authenticatedUser = {
  id: testUserId,
  email: 'test@example.com',
  app_metadata: { providers: ['email'] },
};

describe('changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normal case', () => {
    it('should change password and return success', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(authenticatedUser);
      mockSignInWithPassword.mockResolvedValue({ error: null });
      mockUpdateUserById.mockResolvedValue({ error: null });

      const result = await changePassword('oldPassword1', 'newPassword1');

      expect(result).toEqual({ success: true });
      expect(mockUpdateUserById).toHaveBeenCalledWith(testUserId, {
        password: 'newPassword1',
      });
    });

    it('should log activity event after successful password change', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(authenticatedUser);
      mockSignInWithPassword.mockResolvedValue({ error: null });
      mockUpdateUserById.mockResolvedValue({ error: null });

      await changePassword('oldPassword1', 'newPassword1');

      expect(mockLogActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'change_password',
        targetType: 'user',
        targetId: testUserId,
      });
    });
  });

  describe('error cases', () => {
    it('should return error when user has no email', async () => {
      mockGetAuthenticatedUser.mockResolvedValue({
        ...authenticatedUser,
        email: undefined,
      });

      const result = await changePassword('oldPassword1', 'newPassword1');

      expect(result).toEqual({ error: 'noEmail' });
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });

    it('should return error when user is not email auth provider', async () => {
      mockGetAuthenticatedUser.mockResolvedValue({
        ...authenticatedUser,
        app_metadata: { providers: ['google'] },
      });

      const result = await changePassword('oldPassword1', 'newPassword1');

      expect(result).toEqual({ error: 'notEmailAuth' });
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });

    it('should return error when new password is same as current', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(authenticatedUser);

      const result = await changePassword('samePassword1', 'samePassword1');

      expect(result).toEqual({ error: 'passwordSameAsCurrent' });
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });

    it('should return error when current password is incorrect', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(authenticatedUser);
      mockSignInWithPassword.mockResolvedValue({ error: new Error('Invalid credentials') });

      const result = await changePassword('wrongPassword', 'newPassword1');

      expect(result).toEqual({ error: 'currentPasswordIncorrect' });
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });

    it('should return error when admin update fails', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(authenticatedUser);
      mockSignInWithPassword.mockResolvedValue({ error: null });
      mockUpdateUserById.mockResolvedValue({ error: { code: 'unknown_error' } });

      const result = await changePassword('oldPassword1', 'newPassword1');

      expect(result).toEqual({ error: 'updateFailed' });
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });

    it('should return weak password error when admin rejects weak password', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(authenticatedUser);
      mockSignInWithPassword.mockResolvedValue({ error: null });
      mockUpdateUserById.mockResolvedValue({ error: { code: 'weak_password' } });

      const result = await changePassword('oldPassword1', 'newPassword1');

      expect(result).toEqual({ error: 'password:weak' });
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });

    it('should return rateLimited when rate limit is exceeded', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(authenticatedUser);
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ error: 'rateLimited' } as never);

      const result = await changePassword('oldPassword1', 'newPassword1');

      expect(result).toEqual({ error: 'rateLimited' });
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it('should return validation error when new password is too short', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(authenticatedUser);

      const result = await changePassword('oldPassword1', 'short');

      expect(result).toEqual({ error: 'password:tooShort' });
      expect(mockLogActivityEvent).not.toHaveBeenCalled();
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });
  });
});
