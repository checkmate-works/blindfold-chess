import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockHasActiveSubscription = vi.fn();
vi.mock('@/lib/billing/subscription', () => ({
  hasActiveSubscription: (...args: unknown[]) => mockHasActiveSubscription(...args),
}));

const mockHasActiveGrant = vi.fn();
vi.mock('@/lib/users/user-grants', () => ({
  hasActiveGrant: (...args: unknown[]) => mockHasActiveGrant(...args),
}));

vi.mock('server-only', () => ({}));

const { computeAdsHiddenValueForUser } = await import('./ads-hidden-cookie-compute');

describe('computeAdsHiddenValueForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for anonymous visitors (userId === null)', async () => {
    const result = await computeAdsHiddenValueForUser(null);
    expect(result).toBeNull();
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
    expect(mockHasActiveGrant).not.toHaveBeenCalled();
  });

  it('returns "1" when the user has an active subscription', async () => {
    mockHasActiveSubscription.mockResolvedValue(true);
    mockHasActiveGrant.mockResolvedValue(false);

    const result = await computeAdsHiddenValueForUser('user-1');

    expect(result).toBe('1');
  });

  it('returns "1" when the user has an active ad_free grant', async () => {
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(true);

    const result = await computeAdsHiddenValueForUser('user-2');

    expect(result).toBe('1');
    expect(mockHasActiveGrant).toHaveBeenCalledWith('user-2', 'ad_free');
  });

  it('returns null when the user has neither a subscription nor a grant', async () => {
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(false);

    const result = await computeAdsHiddenValueForUser('user-3');

    expect(result).toBeNull();
  });
});
