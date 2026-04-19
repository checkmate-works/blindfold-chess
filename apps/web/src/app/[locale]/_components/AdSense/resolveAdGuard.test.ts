import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsNoAdsScope = vi.fn();
vi.mock('@/lib/ads/no-ads-scope', () => ({
  isNoAdsScope: () => mockIsNoAdsScope(),
}));

const mockShouldShowAds = vi.fn();
vi.mock('@/lib/ads/ad', () => ({
  shouldShowAds: () => mockShouldShowAds(),
}));

vi.mock('@/config', () => ({
  IS_LOCAL_DEV: false,
}));

const { resolveAdGuard } = await import('./resolveAdGuard');

describe('resolveAdGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "hidden" when the no-ads scope is marked, without consulting shouldShowAds', async () => {
    mockIsNoAdsScope.mockReturnValue(true);
    mockShouldShowAds.mockResolvedValue(true);

    const result = await resolveAdGuard();

    expect(result).toBe('hidden');
    expect(mockShouldShowAds).not.toHaveBeenCalled();
  });

  it('falls through to shouldShowAds when the no-ads scope is not marked', async () => {
    mockIsNoAdsScope.mockReturnValue(false);
    mockShouldShowAds.mockResolvedValue(true);

    const result = await resolveAdGuard();

    expect(result).toBe('show');
    expect(mockShouldShowAds).toHaveBeenCalled();
  });
});
