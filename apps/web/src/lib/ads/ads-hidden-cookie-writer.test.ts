import type { NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RANK_STATUS_CACHE_TAG } from '@/lib/cache-tags';
import type { GrantedRank } from '@/lib/db/data/ranks';

import { ADS_HIDDEN_COOKIE_NAME, adsHiddenCookieOptions } from './ads-hidden-cookie';

const mockComputeAdsHiddenValueForUser = vi.fn();

vi.mock('./ads-hidden-cookie-compute', () => ({
  computeAdsHiddenValueForUser: (...args: unknown[]) => mockComputeAdsHiddenValueForUser(...args),
}));

// Shared spy store so the dan-promotion tests can observe `cookies().set`
// calls; the `refreshAdsHiddenCookieOnResponse` tests never invoke it.
const mockCookieStore = { set: vi.fn(), delete: vi.fn() };
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

const mockRevalidateTag = vi.fn();
vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

const { refreshAdsHiddenCookieOnDanPromotion, refreshAdsHiddenCookieOnResponse } =
  await import('./ads-hidden-cookie-writer');

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

describe('refreshAdsHiddenCookieOnDanPromotion', () => {
  const danRank: GrantedRank = { slug: '1dan', level: 110, color: 'black' };
  const kyuRanks: GrantedRank[] = [
    { slug: '2kyu', level: 40, color: 'green' },
    { slug: '1kyu', level: 50, color: 'brown' },
  ];

  beforeEach(() => {
    mockCookieStore.set.mockReset();
    mockCookieStore.delete.mockReset();
    mockRevalidateTag.mockReset();
  });

  it('is a no-op for an empty grant batch', async () => {
    await refreshAdsHiddenCookieOnDanPromotion([]);

    expect(mockRevalidateTag).not.toHaveBeenCalled();
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it('is a no-op when the batch contains only kyū ranks', async () => {
    await refreshAdsHiddenCookieOnDanPromotion(kyuRanks);

    expect(mockRevalidateTag).not.toHaveBeenCalled();
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it("revalidates the rank-status tag and sets the cookie to '1' when the batch crosses into dan", async () => {
    // The cascade case: one trigger granting [2kyu, 1kyu, 1dan] at once.
    await refreshAdsHiddenCookieOnDanPromotion([...kyuRanks, danRank]);

    expect(mockRevalidateTag).toHaveBeenCalledWith(RANK_STATUS_CACHE_TAG, { expire: 60 });
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      ADS_HIDDEN_COOKIE_NAME,
      '1',
      adsHiddenCookieOptions()
    );
    expect(mockCookieStore.delete).not.toHaveBeenCalled();
  });

  it('never deletes the cookie — a dan promotion can only add the entitlement', async () => {
    await refreshAdsHiddenCookieOnDanPromotion([danRank]);

    expect(mockCookieStore.delete).not.toHaveBeenCalled();
  });

  it('swallows cookie-write failures — the rank grant already happened', async () => {
    mockCookieStore.set.mockImplementation(() => {
      throw new Error('cookies unavailable');
    });

    await expect(refreshAdsHiddenCookieOnDanPromotion([danRank])).resolves.toBeUndefined();
  });
});
