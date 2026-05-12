import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsNoAdsScope = vi.fn();
vi.mock('@/lib/ads/no-ads-scope', () => ({
  isNoAdsScope: () => mockIsNoAdsScope(),
}));

vi.mock('@/config', () => ({
  IS_LOCAL_DEV: false,
}));

const { resolveAdGuard } = await import('./resolveAdGuard');

describe('resolveAdGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "hidden" when the no-ads scope is marked', () => {
    mockIsNoAdsScope.mockReturnValue(true);

    expect(resolveAdGuard()).toBe('hidden');
  });

  it('returns "show" when no-ads scope is not marked (production)', () => {
    mockIsNoAdsScope.mockReturnValue(false);

    expect(resolveAdGuard()).toBe('show');
  });
});
