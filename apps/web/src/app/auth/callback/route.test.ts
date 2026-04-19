import { NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/users/activity-log';

vi.mock('server-only', () => ({}));

const mockComputeAdsHiddenValueForUser = vi.fn().mockResolvedValue(null);
vi.mock('@/lib/ads/ads-hidden-cookie-compute', () => ({
  computeAdsHiddenValueForUser: mockComputeAdsHiddenValueForUser,
}));

const mockUserId = 'test-user-id-12345678';

const mockExchangeCodeForSession = vi.fn();
const mockVerifyOtp = vi.fn();

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        verifyOtp: mockVerifyOtp,
      },
    }),
}));

const mockGetLocaleFromRequest = vi.fn();

vi.mock('@/lib/locale', () => ({
  getLocaleFromRequest: () => mockGetLocaleFromRequest(),
}));

const mockDbSelect = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockDbSelect(),
        }),
      }),
    }),
  },
  profiles: {
    username: 'username',
    displayName: 'display_name',
    id: 'id',
  },
}));

// Dynamic import so the `vi.mock` calls above are applied before the
// route module evaluates its `server-only` and config imports.
const { GET } = await import('./route');

const mockRedirect = vi.spyOn(NextResponse, 'redirect');

function mockSuccessfulExchange(userId = mockUserId) {
  return {
    error: null,
    data: {
      session: {
        user: { id: userId },
      },
    },
  };
}

describe('Auth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: falls back to DEFAULT_LOCALE = 'en'
    mockGetLocaleFromRequest.mockResolvedValue('en');
    // Default: user has a profile
    mockDbSelect.mockResolvedValue([{ username: 'alice' }]);
  });

  describe('successful code exchange', () => {
    it('should redirect to /en/mypage with toast param when no next parameter is provided', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      await GET(request);

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code');
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });

    it('should redirect to /ja/mypage with toast param when locale cookie is ja', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/ja/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });

    it('should redirect to the next parameter path with toast param on success', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=/en/games/play'
      );
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/games/play');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });
  });

  describe('open redirect protection', () => {
    it('should redirect to default when next parameter is an absolute URL', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=https://evil.com'
      );
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });

    it('should redirect to default when next parameter uses protocol-relative URL (//)', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=//evil.com'
      );
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });

    it('should allow paths that start with a single slash', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=/ja/settings'
      );
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/ja/settings');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });
  });

  describe('new user without profile', () => {
    it('should redirect to setup-username when no profile exists', async () => {
      mockDbSelect.mockResolvedValue([]);
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage/setup-username');
    });

    it('should redirect to setup-username with correct locale', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      mockDbSelect.mockResolvedValue([]);
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/ja/mypage/setup-username');
    });
  });

  describe('error handling', () => {
    it('should redirect to sign-in with error when code exchange fails', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: new Error('Invalid code') });

      const request = new Request('http://localhost:3000/auth/callback?code=invalid-code');
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/sign-in?error=auth_callback_error'
      );
    });

    it('should redirect to sign-in with locale-aware error when locale cookie is ja', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      mockExchangeCodeForSession.mockResolvedValue({ error: new Error('Invalid code') });

      const request = new Request('http://localhost:3000/auth/callback?code=invalid-code');
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/ja/sign-in?error=auth_callback_error'
      );
    });

    it('should redirect to sign-in with error when no code is provided', async () => {
      const request = new Request('http://localhost:3000/auth/callback');
      await GET(request);

      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/sign-in?error=auth_callback_error'
      );
    });

    it('should redirect to sign-in with error when code is empty', async () => {
      const request = new Request('http://localhost:3000/auth/callback?code=');
      await GET(request);

      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/sign-in?error=auth_callback_error'
      );
    });
  });

  describe('locale detection', () => {
    it('should use locale returned by getLocaleFromRequest', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('en');
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });
  });

  describe('toast parameter behavior', () => {
    it('should not include toast param on error redirect', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: new Error('fail') });

      const request = new Request('http://localhost:3000/auth/callback?code=bad');
      await GET(request);

      const redirectArg = mockRedirect.mock.calls[0][0] as string;
      expect(redirectArg).not.toContain('toast=');
    });

    it('should include toast=login_success as the only extra param on default success redirect', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      const paramKeys = Array.from(redirectUrl.searchParams.keys());
      expect(paramKeys).toEqual(['toast']);
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });

    it('should preserve only toast param when next has no query string', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=/ja/mypage'
      );
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/ja/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });
  });

  describe('activity logging', () => {
    it('should log login activity event on successful authentication', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      await GET(request);

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'login',
      });
    });

    it('should not log activity event when code exchange fails', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: new Error('Invalid code') });

      const request = new Request('http://localhost:3000/auth/callback?code=invalid-code');
      await GET(request);

      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should not log activity event when no code is provided', async () => {
      const request = new Request('http://localhost:3000/auth/callback');
      await GET(request);

      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('signup email confirmation (token_hash + type=signup)', () => {
    it('should verify OTP and redirect to mypage with toast on success', async () => {
      mockVerifyOtp.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=abc123&type=signup'
      );
      await GET(request);

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: 'abc123',
        type: 'signup',
      });
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });

    it('should redirect to setup-username when new user has no profile', async () => {
      mockDbSelect.mockResolvedValue([]);
      mockVerifyOtp.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=abc123&type=signup'
      );
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage/setup-username');
    });

    it('should log activity event on successful signup verification', async () => {
      mockVerifyOtp.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=abc123&type=signup'
      );
      await GET(request);

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'login',
      });
    });

    it('should redirect to sign-in with error when signup verification fails', async () => {
      mockVerifyOtp.mockResolvedValue({ error: new Error('Invalid OTP') });

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=invalid&type=signup'
      );
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/sign-in?error=auth_callback_error'
      );
    });

    it('should use locale for signup verification redirect', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      mockVerifyOtp.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=abc123&type=signup'
      );
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/ja/mypage');
    });

    it('should not call exchangeCodeForSession when token_hash is present', async () => {
      mockVerifyOtp.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=abc123&type=signup'
      );
      await GET(request);

      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });
  });

  describe('PKCE recovery flow (code + type=recovery)', () => {
    it('should redirect to reset-password when code exchange succeeds with type=recovery', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=pkce-recovery-code&type=recovery'
      );
      await GET(request);

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('pkce-recovery-code');
      expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3000/en/reset-password');
    });

    it('should use locale for PKCE recovery redirect', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=pkce-recovery-code&type=recovery'
      );
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3000/ja/reset-password');
    });

    it('should not log activity event for PKCE recovery flow', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=pkce-recovery-code&type=recovery'
      );
      await GET(request);

      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should not check profile for PKCE recovery flow', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=pkce-recovery-code&type=recovery'
      );
      await GET(request);

      expect(mockDbSelect).not.toHaveBeenCalled();
    });

    it('should redirect to sign-in with error when PKCE recovery code exchange fails', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: new Error('Invalid code') });

      const request = new Request(
        'http://localhost:3000/auth/callback?code=bad-recovery-code&type=recovery'
      );
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/sign-in?error=auth_callback_error'
      );
    });
  });

  describe('code with unknown type parameter', () => {
    it('should treat code with unknown type as normal OAuth flow', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=oauth-code&type=foo');
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'login',
      });
    });

    it('should treat code with type=signup as normal OAuth flow (not token_hash signup)', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request(
        'http://localhost:3000/auth/callback?code=oauth-code&type=signup'
      );
      await GET(request);

      expect(mockVerifyOtp).not.toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');
    });
  });

  describe('password recovery (token_hash + type=recovery)', () => {
    it('should verify OTP and redirect to reset-password page on success', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=recovery123&type=recovery'
      );
      await GET(request);

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: 'recovery123',
        type: 'recovery',
      });
      expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3000/en/reset-password');
    });

    it('should use locale for recovery redirect', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=recovery123&type=recovery'
      );
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3000/ja/reset-password');
    });

    it('should redirect to sign-in with error when recovery verification fails', async () => {
      mockVerifyOtp.mockResolvedValue({ error: new Error('Invalid token') });

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=invalid&type=recovery'
      );
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/sign-in?error=auth_callback_error'
      );
    });

    it('should not call exchangeCodeForSession for recovery flow', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = new Request(
        'http://localhost:3000/auth/callback?token_hash=recovery123&type=recovery'
      );
      await GET(request);

      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });
  });
});
