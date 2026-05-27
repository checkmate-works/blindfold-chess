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
  adBanners: { slot: 'slot', isActive: 'is_active', sortOrder: 'sort_order' },
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

const { getAllAdBanners, shouldShowAdsForUser } = await import('./ad');

describe('getAllAdBanners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return banners array when banners exist', async () => {
    const banners = [
      {
        id: '1',
        slot: 'header',
        href: 'https://example.com',
        imagePath: '/images/ad1.png',
        alt: 'Ad 1',
        width: 728,
        height: 90,
        isActive: true,
        sortOrder: 0,
      },
      {
        id: '2',
        slot: 'sidebar',
        href: 'https://example.com',
        imagePath: '/images/ad2.png',
        alt: 'Ad 2',
        width: 300,
        height: 250,
        isActive: true,
        sortOrder: 1,
      },
    ];
    mockOrderBy.mockResolvedValue(banners);

    const result = await getAllAdBanners();
    expect(result).toEqual(banners);
  });

  it('should return empty array when no banners exist', async () => {
    mockOrderBy.mockResolvedValue([]);

    const result = await getAllAdBanners();
    expect(result).toEqual([]);
  });

  it('should return empty array when DB query throws an exception (fallback)', async () => {
    mockOrderBy.mockRejectedValue(new Error('DB connection failed'));

    const result = await getAllAdBanners();
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
