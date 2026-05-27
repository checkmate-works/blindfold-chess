import type { NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADS_HIDDEN_COOKIE_NAME, adsHiddenCookieOptions } from './ads-hidden-cookie';

const mockComputeAdsHiddenValueForUser = vi.fn();

vi.mock('./ads-hidden-cookie-compute', () => ({
  computeAdsHiddenValueForUser: (...args: unknown[]) => mockComputeAdsHiddenValueForUser(...args),
}));

// `next/headers` `cookies()` is referenced at module load (the *other* writer
// helper, `writeAdsHiddenCookieForUser`, uses it). It is not invoked by
// `refreshAdsHiddenCookieOnResponse`, but the import must resolve. Mock it
// to a no-op so the module loads cleanly under jsdom.
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ set: vi.fn(), delete: vi.fn() }),
}));

const { refreshAdsHiddenCookieOnResponse } = await import('./ads-hidden-cookie-writer');

type SpyCookies = {
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function createMockResponse(): { response: NextResponse; cookies: SpyCookies } {
  const cookies: SpyCookies = {
    set: vi.fn(),
    delete: vi.fn(),
  };
  // `refreshAdsHiddenCookieOnResponse` only uses `response.cookies.set` /
  // `response.cookies.delete`, so a minimal duck-typed object is enough.
  const response = { cookies } as unknown as NextResponse;
  return { response, cookies };
}

describe('refreshAdsHiddenCookieOnResponse', () => {
  beforeEach(() => {
    mockComputeAdsHiddenValueForUser.mockReset();
  });

  describe("when computeAdsHiddenValueForUser returns '1' (user should hide ads)", () => {
    it("sets the bfc_ads_hidden cookie to '1' with the configured cookie options", async () => {
      mockComputeAdsHiddenValueForUser.mockResolvedValue('1');
      const { response, cookies } = createMockResponse();

      await refreshAdsHiddenCookieOnResponse(response, 'user-paying');

      expect(mockComputeAdsHiddenValueForUser).toHaveBeenCalledWith('user-paying');
      expect(cookies.set).toHaveBeenCalledTimes(1);
      expect(cookies.set).toHaveBeenCalledWith(
        ADS_HIDDEN_COOKIE_NAME,
        '1',
        adsHiddenCookieOptions()
      );
      expect(cookies.delete).not.toHaveBeenCalled();
    });

    it('uses the canonical cookie name (bfc_ads_hidden)', async () => {
      mockComputeAdsHiddenValueForUser.mockResolvedValue('1');
      const { response, cookies } = createMockResponse();

      await refreshAdsHiddenCookieOnResponse(response, 'user-1');

      const [name] = cookies.set.mock.calls[0];
      expect(name).toBe('bfc_ads_hidden');
    });

    it('uses the cookie options from adsHiddenCookieOptions() (path, sameSite, maxAge, etc.)', async () => {
      mockComputeAdsHiddenValueForUser.mockResolvedValue('1');
      const { response, cookies } = createMockResponse();

      await refreshAdsHiddenCookieOnResponse(response, 'user-2');

      const [, , options] = cookies.set.mock.calls[0];
      expect(options).toEqual(adsHiddenCookieOptions());
      expect(options.path).toBe('/');
      expect(options.sameSite).toBe('lax');
      expect(options.httpOnly).toBe(false);
      expect(typeof options.maxAge).toBe('number');
      expect(options.maxAge).toBeGreaterThan(0);
    });
  });

  describe('when computeAdsHiddenValueForUser returns null (user should see ads)', () => {
    it('deletes the bfc_ads_hidden cookie', async () => {
      mockComputeAdsHiddenValueForUser.mockResolvedValue(null);
      const { response, cookies } = createMockResponse();

      await refreshAdsHiddenCookieOnResponse(response, 'user-free');

      expect(mockComputeAdsHiddenValueForUser).toHaveBeenCalledWith('user-free');
      expect(cookies.delete).toHaveBeenCalledTimes(1);
      expect(cookies.delete).toHaveBeenCalledWith(ADS_HIDDEN_COOKIE_NAME);
      expect(cookies.set).not.toHaveBeenCalled();
    });
  });

  describe('when userId is null (anonymous request)', () => {
    it('still calls computeAdsHiddenValueForUser(null) and deletes the cookie', async () => {
      // The compute helper short-circuits on null and returns null; we
      // verify the writer forwards null through faithfully and reacts to
      // the resulting null by deleting the cookie. That matches the
      // documented sign-out / unauth behaviour.
      mockComputeAdsHiddenValueForUser.mockResolvedValue(null);
      const { response, cookies } = createMockResponse();

      await refreshAdsHiddenCookieOnResponse(response, null);

      expect(mockComputeAdsHiddenValueForUser).toHaveBeenCalledTimes(1);
      expect(mockComputeAdsHiddenValueForUser).toHaveBeenCalledWith(null);
      expect(cookies.delete).toHaveBeenCalledWith(ADS_HIDDEN_COOKIE_NAME);
      expect(cookies.set).not.toHaveBeenCalled();
    });
  });

  describe('error propagation', () => {
    it('propagates errors thrown by computeAdsHiddenValueForUser', async () => {
      // The proxy is responsible for swallowing this error (and reporting to
      // Sentry). The writer itself does NOT swallow — it propagates so its
      // unit-level contract is honest. This test guards against future
      // drift where someone adds an internal try/catch.
      const boom = new Error('compute exploded');
      mockComputeAdsHiddenValueForUser.mockRejectedValue(boom);
      const { response, cookies } = createMockResponse();

      await expect(refreshAdsHiddenCookieOnResponse(response, 'user-1')).rejects.toThrow(
        'compute exploded'
      );
      expect(cookies.set).not.toHaveBeenCalled();
      expect(cookies.delete).not.toHaveBeenCalled();
    });
  });
});
