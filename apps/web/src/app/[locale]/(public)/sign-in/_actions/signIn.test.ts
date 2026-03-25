import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signIn } from './signIn';

const mockSignInWithPassword = vi.fn();
const mockLogActivityEvent = vi.fn();
const mockGetClientIp = vi.fn();
const mockGetLocaleFromRequest = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      },
    }),
}));

vi.mock('@/lib/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

vi.mock('@/lib/client-ip', () => ({
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

vi.mock('@/lib/locale', () => ({
  getLocaleFromRequest: (...args: unknown[]) => mockGetLocaleFromRequest(...args),
}));

vi.mock('@/lib/rate-limit-ip', () => ({
  checkIpRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  IP_RATE_LIMITS: {
    signIn: { maxAttempts: 5, windowMs: 60_000 },
  },
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

describe('signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockResolvedValue('127.0.0.1');
    mockGetLocaleFromRequest.mockResolvedValue('en');
  });

  it('should call logActivityEvent with userId and action login on successful sign-in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: testUserId } },
    });

    await signIn('test@example.com', 'password123');

    expect(mockLogActivityEvent).toHaveBeenCalledWith({
      userId: testUserId,
      action: 'login',
    });
  });

  it('should not log activity event when rate limited', async () => {
    const { checkIpRateLimit } = await import('@/lib/rate-limit-ip');
    vi.mocked(checkIpRateLimit).mockReturnValueOnce({ allowed: false } as never);

    const result = await signIn('test@example.com', 'password123');

    expect(result).toEqual({ error: 'rateLimited' });
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('should not log activity event when authentication fails', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: new Error('Invalid credentials'),
      data: { user: null },
    });

    const result = await signIn('test@example.com', 'wrongpassword');

    expect(result).toEqual({ error: 'invalidCredentials' });
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
  });
});
