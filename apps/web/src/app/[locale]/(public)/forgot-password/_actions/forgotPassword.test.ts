import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/users/activity-log';

import { forgotPassword } from './forgotPassword';

const mockResetPasswordForEmail = vi.fn();
const mockGetUser = vi.fn();
const mockGuardByIpRateLimit = vi.fn();
const mockConsumeEmailRateLimit = vi.fn();

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/security/rate-limit-ip', () => ({
  guardByIpRateLimit: (...args: unknown[]) => mockGuardByIpRateLimit(...args),
  consumeEmailRateLimit: (...args: unknown[]) => mockConsumeEmailRateLimit(...args),
}));

vi.mock('@/config', () => ({
  SITE_URL: 'http://localhost:3000',
}));

const mockUserId = 'user-00000000-0000-0000-0000-000000000001';

describe('forgotPassword', () => {
  beforeEach(() => {
    mockGuardByIpRateLimit.mockResolvedValue(null);
    mockConsumeEmailRateLimit.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it('should return success when resetPasswordForEmail succeeds', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await forgotPassword('test@example.com');

    expect(result).toEqual({ success: true });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: 'http://localhost:3000/auth/callback?type=recovery',
    });
  });

  it('should return success even when resetPasswordForEmail fails (prevents account enumeration)', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: new Error('fail') });

    const result = await forgotPassword('test@example.com');

    expect(result).toEqual({ success: true });
  });

  it('should return rateLimited when IP rate limit is exceeded', async () => {
    mockGuardByIpRateLimit.mockResolvedValue({ error: 'rateLimited' });

    const result = await forgotPassword('test@example.com');

    expect(result).toEqual({ error: 'rateLimited' });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('should proceed when IP rate limit is not exceeded', async () => {
    mockGuardByIpRateLimit.mockResolvedValue(null);
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await forgotPassword('test@example.com');

    expect(result).toEqual({ success: true });
  });

  it('should return resetFailed when email is invalid', async () => {
    const result = await forgotPassword('not-an-email');

    expect(result).toEqual({ error: 'resetFailed' });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  describe('per-email limit', () => {
    it('sends the reset email when the per-email bucket has room', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await forgotPassword('test@example.com');

      expect(result).toEqual({ success: true });
      expect(mockConsumeEmailRateLimit).toHaveBeenCalledWith('forgotPassword', 'test@example.com');
      expect(mockResetPasswordForEmail).toHaveBeenCalledTimes(1);
    });

    it('suppresses the email but still answers success when the bucket is full', async () => {
      mockConsumeEmailRateLimit.mockResolvedValue(false);
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});

      const result = await forgotPassword('test@example.com');

      expect(result).toEqual({ success: true });
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(info.mock.calls)).not.toContain('test@example.com');
      info.mockRestore();
    });

    it('answers identically whether or not the email was suppressed', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });
      const sent = await forgotPassword('test@example.com');

      mockConsumeEmailRateLimit.mockResolvedValue(false);
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});
      const suppressed = await forgotPassword('test@example.com');
      info.mockRestore();

      expect(suppressed).toEqual(sent);
    });

    it('does not consume a slot for an invalid email', async () => {
      await forgotPassword('not-an-email');

      expect(mockConsumeEmailRateLimit).not.toHaveBeenCalled();
    });

    it('does not consume a slot when the IP limit already refused the request', async () => {
      mockGuardByIpRateLimit.mockResolvedValue({ error: 'rateLimited' });

      const result = await forgotPassword('test@example.com');

      expect(result).toEqual({ error: 'rateLimited' });
      expect(mockConsumeEmailRateLimit).not.toHaveBeenCalled();
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  describe('activity logging', () => {
    it('should log request_password_reset when user is authenticated', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });
      mockGetUser.mockResolvedValue({ data: { user: { id: mockUserId } } });

      await forgotPassword('test@example.com');

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'request_password_reset',
      });
    });

    it('should NOT log activity when user is not authenticated', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await forgotPassword('test@example.com');

      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should NOT log activity when resetPasswordForEmail fails', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: new Error('fail') });

      await forgotPassword('test@example.com');

      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should NOT log activity when IP rate limit is exceeded', async () => {
      mockGuardByIpRateLimit.mockResolvedValue({ error: 'rateLimited' });
      mockGetUser.mockResolvedValue({ data: { user: { id: mockUserId } } });

      await forgotPassword('test@example.com');

      expect(logActivityEvent).not.toHaveBeenCalled();
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });
  });
});
