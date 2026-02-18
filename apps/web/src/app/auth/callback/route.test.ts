import { NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const mockExchangeCodeForSession = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    }),
}));

const mockRedirect = vi.spyOn(NextResponse, 'redirect');

describe('Auth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful code exchange', () => {
    it('should redirect to / when no next parameter is provided', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const request = new Request('http://localhost:3000/auth/callback?code=test-code');
      await GET(request);

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code');
      expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3000/');
    });

    it('should redirect to the next parameter path on success', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=/en/play'
      );
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3000/en/play');
    });
  });

  describe('open redirect protection', () => {
    it('should redirect to / when next parameter is an absolute URL', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=https://evil.com'
      );
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3000/');
    });

    it('should redirect to / when next parameter uses protocol-relative URL (//)', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=//evil.com'
      );
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3000/');
    });

    it('should allow paths that start with a single slash', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=/ja/settings'
      );
      await GET(request);

      expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3000/ja/settings');
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
});
