import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockHasActiveSubscription = vi.fn();
vi.mock('@/lib/billing/subscription', () => ({
  hasActiveSubscription: (...args: unknown[]) => mockHasActiveSubscription(...args),
}));

const mockHasActiveGrant = vi.fn();
vi.mock('@/lib/users/user-grants', () => ({
  hasActiveGrant: (...args: unknown[]) => mockHasActiveGrant(...args),
}));

const mockHasDanTierRank = vi.fn();
vi.mock('@/lib/users/dan-rank', () => ({
  hasDanTierRank: (...args: unknown[]) => mockHasDanTierRank(...args),
}));

vi.mock('server-only', () => ({}));

const { hasAdFreeEntitlement } = await import('./ad-free-entitlement');

describe('hasAdFreeEntitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(false);
    mockHasDanTierRank.mockResolvedValue(false);
  });

  it('is false for anonymous visitors without touching any source', async () => {
    await expect(hasAdFreeEntitlement(null)).resolves.toBe(false);
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
    expect(mockHasActiveGrant).not.toHaveBeenCalled();
    expect(mockHasDanTierRank).not.toHaveBeenCalled();
  });

  it('is false when no source grants the entitlement', async () => {
    await expect(hasAdFreeEntitlement('user-1')).resolves.toBe(false);
    expect(mockHasActiveGrant).toHaveBeenCalledWith('user-1', 'ad_free');
    expect(mockHasDanTierRank).toHaveBeenCalledWith('user-1');
  });

  it.each([
    ['an active subscription', mockHasActiveSubscription],
    ['an active ad_free grant', mockHasActiveGrant],
    ['a dan-tier rank', mockHasDanTierRank],
  ])('is true with %s alone', async (_label, source) => {
    source.mockResolvedValue(true);
    await expect(hasAdFreeEntitlement('user-2')).resolves.toBe(true);
  });
});
