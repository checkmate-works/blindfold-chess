import { NextRequest, NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { proxy } from '../src/proxy';

const mockUpdateSession = vi.fn();

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

function createRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticated user accessing sign-in page', () => {
    it('should redirect to /en/mypage with toast param when accessing /en/sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: true });

      const request = createRequest('/en/sign-in');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get('location')!);
      expect(location.pathname).toBe('/en/mypage');
      expect(location.searchParams.get('toast')).toBe('already_logged_in');
    });

    it('should redirect to /ja/mypage with toast param when accessing /ja/sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: true });

      const request = createRequest('/ja/sign-in');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get('location')!);
      expect(location.pathname).toBe('/ja/mypage');
      expect(location.searchParams.get('toast')).toBe('already_logged_in');
    });

    it('should redirect when accessing /en/sign-in/ (trailing slash)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: true });

      const request = createRequest('/en/sign-in/');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get('location')!);
      expect(location.pathname).toBe('/en/mypage');
      expect(location.searchParams.get('toast')).toBe('already_logged_in');
    });

    it('should not redirect when accessing other pages like /en/games/play', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: true });

      const request = createRequest('/en/games/play');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });

    it('should not redirect when accessing /en/mypage', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: true });

      const request = createRequest('/en/mypage');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });
  });

  describe('unauthenticated user accessing sign-in page', () => {
    it('should not redirect when accessing /en/sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/en/sign-in');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });

    it('should not redirect when accessing /ja/sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/ja/sign-in');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });
  });

  describe('unauthenticated user accessing auth-required pages', () => {
    it('should redirect to /en/sign-in when accessing /en/mypage', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/en/mypage');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      expect(new URL(result.headers.get('location')!).pathname).toBe('/en/sign-in');
    });

    it('should redirect to /ja/sign-in when accessing /ja/mypage', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/ja/mypage');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      expect(new URL(result.headers.get('location')!).pathname).toBe('/ja/sign-in');
    });

    it('should not include toast param when redirecting unauthenticated user to sign-in', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/en/mypage');
      const result = await proxy(request);

      const location = new URL(result.headers.get('location')!);
      expect(location.searchParams.get('toast')).toBeNull();
    });
  });

  describe('non-auth pages pass through for all users', () => {
    it('should pass through for /en/games/play (unauthenticated)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/en/games/play');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });

    it('should pass through for /ja/practice (authenticated)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: true });

      const request = createRequest('/ja/practice');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
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
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/admin');
      const result = await proxy(request);

      expect(result.status).toBe(404);
    });

    it('should return 404 for unauthenticated users accessing /admin/users', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/admin/users');
      const result = await proxy(request);

      expect(result.status).toBe(404);
    });

    it('should return 404 for unauthenticated users accessing /Admin (case-insensitive)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/Admin');
      const result = await proxy(request);

      expect(result.status).toBe(404);
    });

    it('should return 404 for unauthenticated users accessing /ADMIN/users (case-insensitive)', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

      const request = createRequest('/ADMIN/users');
      const result = await proxy(request);

      expect(result.status).toBe(404);
    });

    it('should pass through for authenticated users accessing /admin', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: true });

      const request = createRequest('/admin');
      const result = await proxy(request);

      expect(result).toBe(mockResponse);
    });
  });

  describe('session refresh', () => {
    it('should always call updateSession for non-blocked paths', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: false });

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
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: true });

      const request = createRequest('/en/sign-in');
      const result = await proxy(request);

      const location = new URL(result.headers.get('location')!);
      const paramKeys = Array.from(location.searchParams.keys());
      expect(paramKeys).toEqual(['toast']);
    });

    it('should redirect from /en/sign-in with query params and still add toast', async () => {
      const mockResponse = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: mockResponse, authenticated: true });

      const request = createRequest('/en/sign-in?error=auth_callback_error');
      const result = await proxy(request);

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get('location')!);
      expect(location.pathname).toBe('/en/mypage');
      expect(location.searchParams.get('toast')).toBe('already_logged_in');
    });
  });
});
