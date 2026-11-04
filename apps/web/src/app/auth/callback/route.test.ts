import { NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { logActivityEvent } from '@/lib/users/activity-log';

const mockCaptureError = vi.fn();
vi.mock('@/lib/sentry/capture-error', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

const mockComputeAdsHiddenValueForUser = vi.fn().mockResolvedValue(null);
vi.mock('@/lib/ads/ads-hidden-cookie-compute', () => ({
  computeAdsHiddenValueForUser: mockComputeAdsHiddenValueForUser,
}));

const mockUserId = 'test-user-id-12345678';

const mockExchangeCodeForSession = vi.fn();
const mockVerifyOtp = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        verifyOtp: mockVerifyOtp,
        getUser: mockGetUser,
      },
    }),
}));

const mockGetLocaleFromRequest = vi.fn();

vi.mock('@/lib/locale', () => ({
  getLocaleFromRequest: () => mockGetLocaleFromRequest(),
}));

const mockDbSelect = vi.fn();

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockDbSelect(),
        }),
      }),
    }),
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
    // Default: falls back to DEFAULT_LOCALE = 'en'
    mockGetLocaleFromRequest.mockResolvedValue('en');
    // Default: user has a profile
    mockDbSelect.mockResolvedValue([{ username: 'alice' }]);
    // Default: no session on this device
    mockGetUser.mockResolvedValue({ data: { user: null } });
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

    it('drops any next when routing a new user to setup-username — onboarding is unconditional', async () => {
      // Threading next through username setup was tried and abandoned (the
      // email-confirmation hop makes it unreliable); in-app surfaces pick
      // the funnel back up instead.
      mockDbSelect.mockResolvedValue([]);
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const next = '/en/games/shared/abc?claim=1';
      const request = new Request(
        `http://localhost:3000/auth/callback?code=test-code&next=${encodeURIComponent(next)}`
      );
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage/setup-username');
      expect(redirectUrl.searchParams.get('next')).toBeNull();
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

  describe('ads-hidden cookie compute isolation', () => {
    it('still returns a success redirect when computeAdsHiddenValueForUser rejects', async () => {
      const computeError = new Error('ads-hidden DB blip');
      mockComputeAdsHiddenValueForUser.mockRejectedValueOnce(computeError);
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      const response = await GET(request);

      // Sign-in must not fail over a cosmetic cookie concern.
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/mypage');
      expect(redirectUrl.searchParams.get('toast')).toBe('login_success');

      // The ads-hidden cookie is deleted (null) — the user may see ads for
      // a few page loads until `getSessionUser()` self-corrects the state.
      // `NextResponse.cookies.delete()` encodes the deletion as an empty-
      // value cookie with an expired `expires` (Epoch 0). That is the
      // client's instruction to drop the cookie.
      const cookie = response.cookies.get('bfc_ads_hidden');
      expect(cookie?.value).toBe('');
      expect(cookie?.expires && new Date(cookie.expires).getTime()).toBe(0);

      // The regression must be observable in operations.
      expect(mockCaptureError).toHaveBeenCalledTimes(1);
      expect(mockCaptureError).toHaveBeenCalledWith(computeError, expect.any(String));
    });

    it('logs activity and queries the profile even when ads-hidden compute rejects', async () => {
      mockComputeAdsHiddenValueForUser.mockRejectedValueOnce(new Error('ads-hidden DB blip'));
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      await GET(request);

      // Unchanged contract: login is logged and the profile is checked.
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'login',
      });
      expect(mockDbSelect).toHaveBeenCalled();
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

  describe('email change (token_hash + type=email_change)', () => {
    const url = 'http://localhost:3000/auth/callback?token_hash=change123&type=email_change';

    it('sends the first link (no session issued) to the account page with a pending notice when signed in', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null, data: { session: null } });
      mockGetUser.mockResolvedValue({ data: { user: { id: mockUserId } } });

      await GET(new Request(url));

      expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: 'change123', type: 'email_change' });
      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/mypage/account?notice=emailChangePending'
      );
      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('sends the first link through sign-in with the account page as return path when signed out', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null, data: { session: null } });

      await GET(new Request(url));

      const target = mockRedirect.mock.calls[0][0] as string;
      const redirectUrl = new URL(target);
      expect(redirectUrl.pathname).toBe('/en/sign-in');
      expect(redirectUrl.searchParams.get('next')).toBe(
        '/en/mypage/account?notice=emailChangePending'
      );
    });

    it('completes on the second link (session issued), records the change and lands with a done notice', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      mockVerifyOtp.mockResolvedValue({
        error: null,
        data: { session: { user: { id: mockUserId } } },
      });

      await GET(new Request(url));

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/ja/mypage/account?notice=emailChangeDone'
      );
      expect(logActivityEvent).toHaveBeenCalledWith({ userId: mockUserId, action: 'change_email' });
    });

    it('reports an invalid link on the account page when signed in', async () => {
      mockVerifyOtp.mockResolvedValue({ error: new Error('Invalid token'), data: {} });
      mockGetUser.mockResolvedValue({ data: { user: { id: mockUserId } } });

      await GET(new Request(url));

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/mypage/account?notice=emailChangeLinkInvalid'
      );
    });

    it('falls back to the sign-in error when the link is invalid and nobody is signed in', async () => {
      mockVerifyOtp.mockResolvedValue({ error: new Error('Invalid token'), data: {} });

      await GET(new Request(url));

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/sign-in?error=auth_callback_error'
      );
    });

    it('does not exchange a code for the email change flow', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null, data: { session: null } });

      await GET(new Request(url));

      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });
  });

  describe('Google link return (link=google)', () => {
    it('exchanges the code, records link_identity (not login) and lands with a linked notice', async () => {
      mockExchangeCodeForSession.mockResolvedValue(mockSuccessfulExchange());

      await GET(new Request('http://localhost:3000/auth/callback?link=google&code=abc'));

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc');
      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/mypage/account?notice=linkedGoogle'
      );
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'link_identity',
        metadata: { provider: 'google' },
      });
      expect(logActivityEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: 'login' })
      );
      expect(mockDbSelect).not.toHaveBeenCalled();
    });

    it('reports a duplicate when the auth server says identity_already_exists', async () => {
      await GET(
        new Request(
          'http://localhost:3000/auth/callback?link=google&error=server_error&error_code=identity_already_exists'
        )
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/mypage/account?notice=linkDuplicate'
      );
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });

    it('reports a failure for any other error or a missing code', async () => {
      await GET(new Request('http://localhost:3000/auth/callback?link=google&error=access_denied'));
      expect(mockRedirect).toHaveBeenLastCalledWith(
        'http://localhost:3000/en/mypage/account?notice=linkFailed'
      );

      await GET(new Request('http://localhost:3000/auth/callback?link=google'));
      expect(mockRedirect).toHaveBeenLastCalledWith(
        'http://localhost:3000/en/mypage/account?notice=linkFailed'
      );
    });

    it('reports a failure when the code exchange fails', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      mockExchangeCodeForSession.mockResolvedValue({ error: new Error('bad code'), data: {} });

      await GET(new Request('http://localhost:3000/auth/callback?link=google&code=abc'));

      expect(mockRedirect).toHaveBeenCalledWith(
        'http://localhost:3000/ja/mypage/account?notice=linkFailed'
      );
    });
  });
});
