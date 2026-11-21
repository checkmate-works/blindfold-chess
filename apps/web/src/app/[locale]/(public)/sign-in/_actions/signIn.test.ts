import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signIn } from './signIn';

const mockSignInWithPassword = vi.fn();
const mockLogActivityEvent = vi.fn();
const mockGetClientIp = vi.fn();
const mockGetLocaleFromRequest = vi.fn();
const mockGetViewerProfile = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      },
    }),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

vi.mock('@/lib/security/client-ip', () => ({
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

vi.mock('@/lib/locale', () => ({
  getLocaleFromRequest: (...args: unknown[]) => mockGetLocaleFromRequest(...args),
}));

vi.mock('@/lib/users/viewer-profile', () => ({
  getViewerProfile: (...args: unknown[]) => mockGetViewerProfile(...args),
}));

vi.mock('@/lib/security/rate-limit-ip', () => ({
  guardByIpRateLimit: vi.fn().mockResolvedValue(null),
}));

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

describe('signIn', () => {
  beforeEach(() => {
    mockGetClientIp.mockResolvedValue('127.0.0.1');
    mockGetLocaleFromRequest.mockResolvedValue('en');
    mockGetViewerProfile.mockResolvedValue({ id: testUserId, username: 'tester' });
  });

  it('returns the mypage landing with the login toast for a registered user', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: testUserId } },
    });

    const result = await signIn('test@example.com', 'password123');

    expect(result).toEqual({ success: true, destination: '/en/mypage?toast=login_success' });
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

  it('should not log activity event when IP rate limited', async () => {
    const { guardByIpRateLimit } = await import('@/lib/security/rate-limit-ip');
    vi.mocked(guardByIpRateLimit).mockResolvedValueOnce({ error: 'rateLimited' });

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

  it('builds the default landing from the request locale', async () => {
    mockGetLocaleFromRequest.mockResolvedValue('ja');
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: testUserId } },
    });

    const result = await signIn('test@example.com', 'password123');

    expect(result).toEqual({ success: true, destination: '/ja/mypage?toast=login_success' });
  });

  it('returns a registered user to next', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: testUserId } },
    });

    const result = await signIn('test@example.com', 'password123', '/en/games?tab=mine');

    expect(result).toEqual({
      success: true,
      destination: '/en/games?tab=mine&toast=login_success',
    });
  });

  it('ignores a next that would leave the origin', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: testUserId } },
    });

    const result = await signIn('test@example.com', 'password123', '//evil.com');

    expect(result).toEqual({ success: true, destination: '/en/mypage?toast=login_success' });
  });

  it('sends a user without a profile to username setup and drops next', async () => {
    mockGetViewerProfile.mockResolvedValue(null);
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: testUserId } },
    });

    const result = await signIn('test@example.com', 'password123', '/en/games');

    expect(mockGetViewerProfile).toHaveBeenCalledWith(testUserId);
    expect(result).toEqual({ success: true, destination: '/en/mypage/setup-username' });
  });
});
