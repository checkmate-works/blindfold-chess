import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import { hasDanTierRank } from '@/lib/users/dan-rank';
import { hasActiveGrant } from '@/lib/users/user-grants';

vi.mock('@/lib/billing/subscription');
vi.mock('@/lib/users/user-grants');
vi.mock('@/lib/users/dan-rank');

const mockHasActiveSubscription = vi.mocked(hasActiveSubscription);
const mockHasActiveGrant = vi.mocked(hasActiveGrant);
const mockHasDanTierRank = vi.mocked(hasDanTierRank);

const { hasAdFreeEntitlement } = await import('./ad-free-entitlement');

describe('hasAdFreeEntitlement', () => {
  beforeEach(() => {
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
