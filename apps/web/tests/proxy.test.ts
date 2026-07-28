import { NextRequest, NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { proxy } from '../src/proxy';

const mockUpdateSession = vi.fn();
const mockRefreshAdsHiddenCookieOnResponse = vi.fn();

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

vi.mock('@/lib/ads/ads-hidden-cookie-writer', () => ({
  refreshAdsHiddenCookieOnResponse: (...args: unknown[]) =>
    mockRefreshAdsHiddenCookieOnResponse(...args),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

function createRequest(path: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'), headers ? { headers } : undefined);
}

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshAdsHiddenCookieOnResponse.mockResolvedValue(undefined);
  });

  describe('authenticated user accessing sign-in page', () => {
    it('should redirect to /en/mypage with toast param when accessing /en/sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/en/sign-in');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get('location')!);
      expect(location.pathname).toBe('/en/mypage');
      expect(location.searchParams.get('toast')).toBe('already_logged_in');
    });

    it('should redirect to /ja/mypage with toast param when accessing /ja/sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/ja/sign-in');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get('location')!);
      expect(location.pathname).toBe('/ja/mypage');
      expect(location.searchParams.get('toast')).toBe('already_logged_in');
    });

    it('should redirect when accessing /en/sign-in/ (trailing slash)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/en/sign-in/');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get('location')!);
      expect(location.pathname).toBe('/en/mypage');
      expect(location.searchParams.get('toast')).toBe('already_logged_in');
    });

    it('should not redirect when accessing other pages like /en/games/play', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/en/games/play');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });

    it('should not redirect when accessing /en/mypage', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/en/mypage');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });
  });

  describe('unauthenticated user accessing sign-in page', () => {
    it('should not redirect when accessing /en/sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/en/sign-in');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });

    it('should not redirect when accessing /ja/sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/ja/sign-in');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });
  });

  describe('unauthenticated user accessing auth-required pages', () => {
    it('should redirect to /en/sign-in when accessing /en/mypage', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/en/mypage');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      expect(new URL(result.headers.get('location')!).pathname).toBe('/en/sign-in');
    });

    it('should redirect to /ja/sign-in when accessing /ja/mypage', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/ja/mypage');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      expect(new URL(result.headers.get('location')!).pathname).toBe('/ja/sign-in');
    });

    it('should not include toast param when redirecting unauthenticated user to sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/en/mypage');
      const result = await proxy(request);

      const location = new URL(result.headers.get('location')!);
      expect(location.searchParams.get('toast')).toBeNull();
    });
  });

  describe('non-auth pages pass through for all users', () => {
    it('should pass through for /en/games/play (unauthenticated)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/en/games/play');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });

    it('should pass through for /ja/practice (authenticated)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/ja/practice');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });
  });

  describe('locale prefix completion', () => {
    it('should redirect a locale-less in-app path to the negotiated locale', async () => {
      // Regression guard for the `/games/new` cards, which linked to a bare
      // `/games/new/standard` and 404'd in production.
      const request = createRequest('/games/new/standard', { 'accept-language': 'ja,en;q=0.9' });
      const result = await proxy(request);

      expect(result.status).toBe(307);
      expect(new URL(result.headers.get('location')!).pathname).toBe('/ja/games/new/standard');
    });

    it('should fall back to the default locale without an Accept-Language header', async () => {
      const result = await proxy(createRequest('/practice'));

      expect(result.status).toBe(307);
      expect(new URL(result.headers.get('location')!).pathname).toBe('/en/practice');
    });

    it('should preserve the query string', async () => {
      const result = await proxy(createRequest('/preferences?tab=notifications'));

      const location = new URL(result.headers.get('location')!);
      expect(location.pathname).toBe('/en/preferences');
      expect(location.searchParams.get('tab')).toBe('notifications');
    });

    it('should mark the redirect as language-dependent for caches', async () => {
      const result = await proxy(createRequest('/practice'));

      expect(result.headers.get('vary')).toBe('Accept-Language');
    });

    it('should not spend an auth round-trip on a redirect', async () => {
      await proxy(createRequest('/practice'));

      expect(mockUpdateSession).not.toHaveBeenCalled();
    });

    it('should leave the bare root to the landing page', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const result = await proxy(createRequest('/', { 'accept-language': 'ja' }));

      expect(result.status).not.toBe(307);
      expect(mockUpdateSession).toHaveBeenCalled();
    });

    it('should leave non-localized route trees alone', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      for (const path of ['/admin/users', '/auth/callback', '/g/abc123']) {
        const result = await proxy(createRequest(path, { 'accept-language': 'ja' }));
        expect(result.status, path).not.toBe(307);
      }
    });

    it('should 404 a blocked path rather than redirecting it', async () => {
      const result = await proxy(createRequest('/wp-login.php'));

      expect(result.status).toBe(404);
      expect(result.headers.get('location')).toBeNull();
    });
  });

  describe('blocked paths', () => {
    it('should return 404 for /wp-admin', async () => {
      const request = createRequest('/wp-admin');
      const result = await proxy(request);

      expect(result.status).toBe(404);
      expect(mockUpdateSession).not.toHaveBeenCalled();
    });

    it('should return 404 for /.env', async () => {
      const request = createRequest('/.env');
      const result = await proxy(request);

      expect(result.status).toBe(404);
      expect(mockUpdateSession).not.toHaveBeenCalled();
    });

    it('should return 404 for /wp-login.php', async () => {
      const request = createRequest('/wp-login.php');
      const result = await proxy(request);

      expect(result.status).toBe(404);
      expect(mockUpdateSession).not.toHaveBeenCalled();
    });
  });

  describe('admin path authentication', () => {
    it('should return 404 for unauthenticated users accessing /admin', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/admin');
      const result = await proxy(request);

      expect(result.status).toBe(404);
    });

    it('should return 404 for unauthenticated users accessing /admin/users', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/admin/users');
      const result = await proxy(request);

      expect(result.status).toBe(404);
    });

    it('should return 404 for unauthenticated users accessing /Admin (case-insensitive)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/Admin');
      const result = await proxy(request);

      expect(result.status).toBe(404);
    });

    it('should return 404 for unauthenticated users accessing /ADMIN/users (case-insensitive)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/ADMIN/users');
      const result = await proxy(request);

      expect(result.status).toBe(404);
    });

    it('should pass through for authenticated users accessing /admin', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/admin');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });
  });

  describe('session refresh', () => {
    it('should always call updateSession for non-blocked paths', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/en/games/play');
      await proxy(request);

      // The proxy forwards the request plus a `requestHeaders` option holding
      // the per-request CSP nonce (`x-nonce`) so downstream RSCs can read it.
      expect(mockUpdateSession).toHaveBeenCalledTimes(1);
      const [passedRequest, options] = mockUpdateSession.mock.calls[0];
      expect(passedRequest).toBe(request);
      expect(options?.requestHeaders?.get('x-nonce')).toBeTruthy();
    });
  });

  describe('toast parameter on authenticated sign-in redirect', () => {
    it('should only include toast param and no other unexpected query params', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/en/sign-in');
      const result = await proxy(request);

      const location = new URL(result.headers.get('location')!);
      const paramKeys = Array.from(location.searchParams.keys());
      expect(paramKeys).toEqual(['toast']);
    });

    it('should redirect from /en/sign-in with query params and still add toast', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/en/sign-in?error=auth_callback_error');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get('location')!);
      expect(location.pathname).toBe('/en/mypage');
      expect(location.searchParams.get('toast')).toBe('already_logged_in');
    });
  });

  describe('ads-hidden cookie refresh on /mypage/subscription', () => {
    it('should refresh the ads-hidden cookie for an authenticated user on /en/mypage/subscription', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/en/mypage/subscription');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
      expect(mockRefreshAdsHiddenCookieOnResponse).toHaveBeenCalledWith(mockResponse, 'user-123');
    });

    it('should refresh the ads-hidden cookie on the Stripe-success landing /en/mypage/subscription?status=success', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/en/mypage/subscription?status=success');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
      expect(mockRefreshAdsHiddenCookieOnResponse).toHaveBeenCalledWith(mockResponse, 'user-123');
    });

    it('should refresh the ads-hidden cookie on /ja/mypage/subscription (locale-agnostic)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-456',
      });

      const request = createRequest('/ja/mypage/subscription');
      await proxy(request);

      expect(mockRefreshAdsHiddenCookieOnResponse).toHaveBeenCalledWith(mockResponse, 'user-456');
    });

    it('should NOT call the cookie refresh on other authenticated pages', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });

      const request = createRequest('/en/mypage');
      await proxy(request);

      expect(mockRefreshAdsHiddenCookieOnResponse).not.toHaveBeenCalled();
    });

    it('should NOT call the cookie refresh when an unauthenticated visitor is redirected away from /en/mypage/subscription', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: false,
        userId: null,
      });

      const request = createRequest('/en/mypage/subscription');
      const result = await proxy(request);

      // Unauthenticated users are redirected to sign-in before the cookie
      // refresh has a chance to run (auth-required guard kicks in first).
      expect(result.status).toBe(307);
      expect(mockRefreshAdsHiddenCookieOnResponse).not.toHaveBeenCalled();
    });

    it('should swallow errors from the cookie refresh so the page still renders', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({
        response: mockResponse,
        authenticated: true,
        userId: 'user-123',
      });
      const refreshError = new Error('DB hiccup');
      mockRefreshAdsHiddenCookieOnResponse.mockRejectedValue(refreshError);
      const captureSpy = vi.mocked(Sentry.captureException);

      const request = createRequest('/en/mypage/subscription');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
      // The swallowed error must still surface to Sentry so the regression is
      // observable; otherwise a silent DB outage could mask itself as a
      // working-but-stale ads-hidden cookie indefinitely.
      expect(captureSpy).toHaveBeenCalledWith(refreshError);
      expect(captureSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
