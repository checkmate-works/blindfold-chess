import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

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

const { getSessionUser } = await import('./getSessionUser');

const mockUser = { id: 'user-123', email: 'u@example.com' } as unknown as User;

describe('getSessionUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteAdsHiddenCookieForUser.mockResolvedValue(undefined);
  });

  describe('authenticated user', () => {
    it('returns the user and refreshes the ads-hidden cookie with the user object', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } });

      const result = await getSessionUser();

      expect(result).toEqual(mockUser);
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledTimes(1);
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('anonymous visitor', () => {
    it('returns null and still invokes the cookie writer with null so stale values get cleared', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getSessionUser();

      expect(result).toBeNull();
      // Passing null deletes the cookie inside the writer. Critical for
      // sign-out flows: a user who was previously an ad-free subscriber
      // must not keep seeing no-ads after logging out.
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledTimes(1);
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledWith(null);
    });
  });

  describe('supabase.auth.getUser throws', () => {
    it('returns null and does NOT touch the cookie (per existing robustness contract)', async () => {
      mockGetUser.mockRejectedValue(new Error('supabase down'));

      const result = await getSessionUser();

      expect(result).toBeNull();
      // When we cannot determine the auth state at all, leaving the
      // cookie in its previous state is the safe choice — flipping it
      // in either direction on an unknown user would be wrong.
      expect(mockWriteAdsHiddenCookieForUser).not.toHaveBeenCalled();
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

      expect(result).toEqual(mockUser);
      expect(mockWriteAdsHiddenCookieForUser).toHaveBeenCalledTimes(1);
    });
  });
});
