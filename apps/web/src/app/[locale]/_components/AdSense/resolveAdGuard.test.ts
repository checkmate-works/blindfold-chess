import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsNoAdsScope = vi.fn();
vi.mock('@/lib/ads/no-ads-scope', () => ({
  isNoAdsScope: () => mockIsNoAdsScope(),
}));

const mockIsAdsEnabled = vi.fn();
vi.mock('@/lib/ads/ad', () => ({
  isAdsEnabled: () => mockIsAdsEnabled(),
}));

vi.mock('@/config', () => ({
  IS_LOCAL_DEV: false,
}));

const { resolveAdGuard } = await import('./resolveAdGuard');

describe('resolveAdGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "hidden" when the no-ads scope is marked, without consulting isAdsEnabled', async () => {
    mockIsNoAdsScope.mockReturnValue(true);
    mockIsAdsEnabled.mockResolvedValue(true);

    const result = await resolveAdGuard();

    expect(result).toBe('hidden');
    expect(mockIsAdsEnabled).not.toHaveBeenCalled();
  });

  it('returns "hidden" when ads are globally disabled', async () => {
    mockIsNoAdsScope.mockReturnValue(false);
    mockIsAdsEnabled.mockResolvedValue(false);

    const result = await resolveAdGuard();

    expect(result).toBe('hidden');
  });

  it('returns "show" when no-ads scope is not marked and ads are enabled', async () => {
    mockIsNoAdsScope.mockReturnValue(false);
    mockIsAdsEnabled.mockResolvedValue(true);

    const result = await resolveAdGuard();

    expect(result).toBe('show');
    expect(mockIsAdsEnabled).toHaveBeenCalled();
  });
});
