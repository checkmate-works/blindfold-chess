import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import { hasDanTierRank } from '@/lib/users/dan-rank';
import { hasActiveGrant } from '@/lib/users/user-grants';

vi.mock('@/lib/billing/subscription');
vi.mock('@/lib/users/dan-rank');
vi.mock('@/lib/users/user-grants');

const mockHasActiveSubscription = vi.mocked(hasActiveSubscription);
const mockHasActiveGrant = vi.mocked(hasActiveGrant);
const mockHasDanTierRank = vi.mocked(hasDanTierRank);

const { getAdFreeRedemptionBlock } = await import('./ad-free-redemption');

describe('getAdFreeRedemptionBlock', () => {
  beforeEach(() => {
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasDanTierRank.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(false);
  });

  it('is null when nothing else is already hiding ads', async () => {
    await expect(getAdFreeRedemptionBlock('user-1')).resolves.toBeNull();
    expect(mockHasDanTierRank).toHaveBeenCalledWith('user-1');
    expect(mockHasActiveSubscription).toHaveBeenCalledWith('user-1');
  });

  it('blocks a dan-rank holder', async () => {
    mockHasDanTierRank.mockResolvedValue(true);
    await expect(getAdFreeRedemptionBlock('user-2')).resolves.toBe('dan_rank');
  });

  it('blocks a subscriber', async () => {
    mockHasActiveSubscription.mockResolvedValue(true);
    await expect(getAdFreeRedemptionBlock('user-3')).resolves.toBe('subscription');
  });

  it('reports the permanent reason when both apply', async () => {
    mockHasDanTierRank.mockResolvedValue(true);
    mockHasActiveSubscription.mockResolvedValue(true);
    await expect(getAdFreeRedemptionBlock('user-4')).resolves.toBe('dan_rank');
  });

  it('does not block on an active ad_free grant, which redemptions stack onto', async () => {
    mockHasActiveGrant.mockResolvedValue(true);
    await expect(getAdFreeRedemptionBlock('user-5')).resolves.toBeNull();
  });
});
