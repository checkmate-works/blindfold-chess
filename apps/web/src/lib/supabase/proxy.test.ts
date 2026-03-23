import { NextRequest, NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetClaims = vi.fn();
const mockCreateServerClient = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

function createRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    mockCreateServerClient.mockReturnValue({
      auth: { getClaims: mockGetClaims },
    });
  });

  async function importUpdateSession() {
    const mod = await import('./proxy');
    return mod.updateSession;
  }

  describe('when Supabase env vars are missing', () => {
    it('should return authenticated=false when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

      const updateSession = await importUpdateSession();
      const request = createRequest('/en');
      const result = await updateSession(request);

      expect(result.authenticated).toBe(false);
      expect(result.response).toBeInstanceOf(NextResponse);
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    });

    it('should return authenticated=false when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

      const updateSession = await importUpdateSession();
      const request = createRequest('/en');
      const result = await updateSession(request);

      expect(result.authenticated).toBe(false);
      expect(result.response).toBeInstanceOf(NextResponse);
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    });

    it('should return authenticated=false when both env vars are missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

      const updateSession = await importUpdateSession();
      const request = createRequest('/en');
      const result = await updateSession(request);

      expect(result.authenticated).toBe(false);
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    });
  });

  describe('when Supabase env vars are set', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    });

    it('should return authenticated=true when getClaims succeeds with data', async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: { sub: 'user-123' } },
        error: null,
      });

      const updateSession = await importUpdateSession();
      const request = createRequest('/en');
      const result = await updateSession(request);

      expect(result.authenticated).toBe(true);
      expect(result.response).toBeInstanceOf(NextResponse);
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://example.supabase.co',
        'test-anon-key',
        expect.objectContaining({ cookies: expect.any(Object) })
      );
    });

    it('should return authenticated=false when getClaims returns an error', async () => {
      mockGetClaims.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      });

      const updateSession = await importUpdateSession();
      const request = createRequest('/en');
      const result = await updateSession(request);

      expect(result.authenticated).toBe(false);
      expect(result.response).toBeInstanceOf(NextResponse);
    });

    it('should return authenticated=false when getClaims returns no data and no error', async () => {
      mockGetClaims.mockResolvedValue({
        data: null,
        error: null,
      });

      const updateSession = await importUpdateSession();
      const request = createRequest('/en');
      const result = await updateSession(request);

      expect(result.authenticated).toBe(false);
    });

    it('should create Supabase client with cookie handlers from request', async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: { sub: 'user-123' } },
        error: null,
      });

      const updateSession = await importUpdateSession();
      const request = createRequest('/en');
      await updateSession(request);

      const callArgs = mockCreateServerClient.mock.calls[0];
      expect(callArgs[0]).toBe('https://example.supabase.co');
      expect(callArgs[1]).toBe('test-anon-key');

      const cookieConfig = callArgs[2].cookies;
      expect(typeof cookieConfig.getAll).toBe('function');
      expect(typeof cookieConfig.setAll).toBe('function');
    });

    it('should call getClaims to validate the JWT', async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: { sub: 'user-123' } },
        error: null,
      });

      const updateSession = await importUpdateSession();
      const request = createRequest('/en');
      await updateSession(request);

      expect(mockGetClaims).toHaveBeenCalledOnce();
    });
  });
});
