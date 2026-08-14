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

const { computeAdsHiddenValueForUser } = await import('./ads-hidden-cookie-compute');

describe('computeAdsHiddenValueForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(false);
    mockHasDanTierRank.mockResolvedValue(false);
  });

  it('returns null for anonymous visitors (userId === null)', async () => {
    const result = await computeAdsHiddenValueForUser(null);
    expect(result).toBeNull();
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
    expect(mockHasActiveGrant).not.toHaveBeenCalled();
    expect(mockHasDanTierRank).not.toHaveBeenCalled();
  });

  it('returns "1" when the user has an active subscription', async () => {
    mockHasActiveSubscription.mockResolvedValue(true);

    const result = await computeAdsHiddenValueForUser('user-1');

    expect(result).toBe('1');
  });

  it('returns "1" when the user has an active ad_free grant', async () => {
    mockHasActiveGrant.mockResolvedValue(true);

    const result = await computeAdsHiddenValueForUser('user-2');

    expect(result).toBe('1');
    expect(mockHasActiveGrant).toHaveBeenCalledWith('user-2', 'ad_free');
  });

  it('returns "1" when the user holds a dan-tier rank', async () => {
    mockHasDanTierRank.mockResolvedValue(true);

    const result = await computeAdsHiddenValueForUser('user-dan');

    expect(result).toBe('1');
    expect(mockHasDanTierRank).toHaveBeenCalledWith('user-dan');
  });

  it('returns null when the user has no subscription, grant, or dan rank', async () => {
    const result = await computeAdsHiddenValueForUser('user-3');

    expect(result).toBeNull();
  });
});
