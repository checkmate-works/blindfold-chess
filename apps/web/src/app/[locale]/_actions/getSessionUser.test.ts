import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSentryCaptureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockSentryCaptureException(...args),
}));

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: (...args: unknown[]) => mockGetUser(...args),
      },
    }),
}));

const mockWriteAdsHiddenCookieForUser = vi.fn();
vi.mock('@/lib/ads/ads-hidden-cookie-writer', () => ({
  writeAdsHiddenCookieForUser: (...args: unknown[]) => mockWriteAdsHiddenCookieForUser(...args),
}));

// The profiles lookup that decides `hasProfile`. Returns whatever
// `mockProfileRows()` yields (a row → has profile, [] → provisional).
const mockProfileRows = vi.fn<() => unknown[]>();
vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(mockProfileRows()),
        }),
      }),
    }),
  },
  profiles: { id: 'profiles.id' },
}));

const { getSessionUser } = await import('./getSessionUser');

const mockUser = { id: 'user-123', email: 'u@example.com' } as unknown as User;

describe('getSessionUser', () => {
  beforeEach(() => {
    mockWriteAdsHiddenCookieForUser.mockResolvedValue(undefined);
    // Default: the user has a profile (confirmed member).
    mockProfileRows.mockReturnValue([
      { id: 'user-123', avatarUrl: 'https://example.com/a.png', displayName: 'Tester' },
    ]);
  });

  describe('authenticated user', () => {
    it('returns the user (hasProfile + header profile) and refreshes the ads-hidden cookie with the user object', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } });

      const result = await getSessionUser();

      expect(result).toEqual({
        user: mockUser,
        hasProfile: true,
        profile: { avatarUrl: 'https://example.com/a.png', displayName: 'Tester' },
      });
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledTimes(1);
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledWith(mockUser);
    });

    it('reports hasProfile=false for a provisional user (no profile row)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } });
      mockProfileRows.mockReturnValue([]);

      const result = await getSessionUser();

      expect(result).toEqual({ user: mockUser, hasProfile: false, profile: null });
    });
  });

  describe('anonymous visitor', () => {
    it('returns null user and still invokes the cookie writer with null so stale values get cleared', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getSessionUser();

      expect(result).toEqual({ user: null, hasProfile: false, profile: null });
      // Passing null deletes the cookie inside the writer. Critical for
      // sign-out flows: a user who was previously an ad-free subscriber
      // must not keep seeing no-ads after logging out.
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledTimes(1);
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledWith(null);
    });
  });

  describe('supabase.auth.getUser throws', () => {
    it('returns null, does NOT touch the cookie, and reports the error to Sentry', async () => {
      const authError = new Error('supabase down');
      mockGetUser.mockRejectedValue(authError);

      const result = await getSessionUser();

      expect(result).toEqual({ user: null, hasProfile: false, profile: null });
      // When we cannot determine the auth state at all, leaving the
      // cookie in its previous state is the safe choice — flipping it
      // in either direction on an unknown user would be wrong.
      expect(mockWriteAdsHiddenCookieForUser).not.toHaveBeenCalled();
      // An auth-resolution failure means a real signed-in user may
      // silently appear as anonymous; that regression must be visible in
      // operations, so the error is reported to Sentry.
      expect(mockSentryCaptureException).toHaveBeenCalledTimes(1);
      expect(mockSentryCaptureException).toHaveBeenCalledWith(authError);
    });
  });

  describe('cookie writer throws', () => {
    it('returns the user anyway so AuthProvider stays correct on transient DB errors', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } });
      mockWriteAdsHiddenCookieForUser.mockRejectedValue(new Error('db hiccup'));

      // Design choice: on cookie-writer failure we leave the cookie alone
      // (prior state preserved) rather than force-deleting it. The cookie's
      // 7-day TTL bounds worst-case staleness; the next successful
      // `getSessionUser()` call self-corrects.
      const result = await getSessionUser();

      expect(result).toEqual({
        user: mockUser,
        hasProfile: true,
        profile: { avatarUrl: 'https://example.com/a.png', displayName: 'Tester' },
      });
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledTimes(1);
      // Cookie-writer failures are cosmetic (entitlement queries already
      // log via `console.warn` at a lower layer); only auth-getUser
      // failures should wake up Sentry.
      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });
  });
});
