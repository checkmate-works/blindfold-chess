import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';

import { forgotPassword } from './forgotPassword';

const mockResetPasswordForEmail = vi.fn();
const mockGetUser = vi.fn();
const mockCheckIpRateLimitGuard = vi.fn();
const mockGetClientIp = vi.fn();

vi.mock('@/lib/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/client-ip', () => ({
  getClientIp: () => mockGetClientIp(),
}));

vi.mock('@/lib/rate-limit-ip', () => ({
  IP_RATE_LIMITS: { forgotPassword: { maxRequests: 3, windowMs: 300_000 } },
  checkIpRateLimitGuard: (...args: unknown[]) => mockCheckIpRateLimitGuard(...args),
}));

vi.mock('@/config', () => ({
  SITE_URL: 'http://localhost:3000',
}));

const mockUserId = 'user-00000000-0000-0000-0000-000000000001';

describe('forgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockResolvedValue(null);
    mockCheckIpRateLimitGuard.mockReturnValue(null);
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
    mockGetClientIp.mockResolvedValue('1.2.3.4');
    mockCheckIpRateLimitGuard.mockReturnValue({ error: 'rateLimited' });

    const result = await forgotPassword('test@example.com');

    expect(result).toEqual({ error: 'rateLimited' });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('should proceed when IP rate limit is not exceeded', async () => {
    mockGetClientIp.mockResolvedValue('1.2.3.4');
    mockCheckIpRateLimitGuard.mockReturnValue(null);
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await forgotPassword('test@example.com');

    expect(result).toEqual({ success: true });
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
      mockGetClientIp.mockResolvedValue('1.2.3.4');
      mockCheckIpRateLimitGuard.mockReturnValue({ error: 'rateLimited' });
      mockGetUser.mockResolvedValue({ data: { user: { id: mockUserId } } });

      await forgotPassword('test@example.com');

      expect(logActivityEvent).not.toHaveBeenCalled();
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });
  });
});
