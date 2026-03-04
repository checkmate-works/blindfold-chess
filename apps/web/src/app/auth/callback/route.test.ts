import { NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const mockUserId = 'test-user-id-12345678';

const mockExchangeCodeForSession = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
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
        'http://localhost:3000/auth/callback?code=test-code&next=/en/play'
      );
      await GET(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/en/play');
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
});
