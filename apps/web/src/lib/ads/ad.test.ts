import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockOrderBy = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        orderBy: () => mockOrderBy(),
      }),
    }),
  },
  adCreatives: {
    slot: 'slot',
    sortOrder: 'sort_order',
    isActive: 'is_active',
    createdAt: 'created_at',
  },
}));

// unstable_cache wraps a function; for unit tests we just run the inner fn.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('server-only', () => ({}));

const mockHasActiveSubscription = vi.fn();
vi.mock('@/lib/billing/subscription', () => ({
  hasActiveSubscription: (...args: unknown[]) => mockHasActiveSubscription(...args),
}));

const mockHasActiveGrant = vi.fn();
vi.mock('@/lib/users/user-grants', () => ({
  hasActiveGrant: (...args: unknown[]) => mockHasActiveGrant(...args),
}));

const { getAllAdCreatives, shouldShowAdsForUser } = await import('./ad');

describe('getAllAdCreatives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return creatives array when they exist', async () => {
    const creatives = [
      { id: '1', kind: 'banner', slot: 'content-middle', href: 'https://example.com', payload: {} },
      {
        id: '2',
        kind: 'native_card',
        slot: 'feed-native-ad',
        href: 'https://example.com',
        payload: {},
      },
    ];
    mockOrderBy.mockResolvedValue(creatives);

    const result = await getAllAdCreatives();
    expect(result).toEqual(creatives);
  });

  it('should return empty array when none exist', async () => {
    mockOrderBy.mockResolvedValue([]);

    const result = await getAllAdCreatives();
    expect(result).toEqual([]);
  });

  it('should return empty array when DB query throws (fallback)', async () => {
    mockOrderBy.mockRejectedValue(new Error('DB connection failed'));

    const result = await getAllAdCreatives();
    expect(result).toEqual([]);
  });
});

describe('shouldShowAdsForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for unauthenticated user (null) without checking subscription', async () => {
    const result = await shouldShowAdsForUser(null);
    expect(result).toBe(true);
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
    expect(mockHasActiveGrant).not.toHaveBeenCalled();
  });

  it('should return false for user with active subscription', async () => {
    mockHasActiveSubscription.mockResolvedValue(true);
    mockHasActiveGrant.mockResolvedValue(false);

    const result = await shouldShowAdsForUser('user-123');
    expect(result).toBe(false);
    expect(mockHasActiveSubscription).toHaveBeenCalledWith('user-123');
  });

  it('should return false for user with active ad_free grant', async () => {
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(true);

    const result = await shouldShowAdsForUser('user-789');
    expect(result).toBe(false);
    expect(mockHasActiveGrant).toHaveBeenCalledWith('user-789', 'ad_free');
  });

  it('should return true for user without subscription and without grant', async () => {
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(false);

    const result = await shouldShowAdsForUser('user-456');
    expect(result).toBe(true);
    expect(mockHasActiveSubscription).toHaveBeenCalledWith('user-456');
    expect(mockHasActiveGrant).toHaveBeenCalledWith('user-456', 'ad_free');
  });
});
