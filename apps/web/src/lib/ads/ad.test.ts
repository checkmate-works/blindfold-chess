import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLimit = vi.fn();
const mockOrderBy = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockLimit(),
        }),
        orderBy: () => mockOrderBy(),
      }),
    }),
  },
  siteSettings: { key: 'key', value: 'value' },
  adBanners: { slot: 'slot', isActive: 'is_active', sortOrder: 'sort_order' },
}));

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

const {
  isAdsEnabled,
  getAdBannerBySlot,
  getAdsEnabledDirect,
  getAllAdBanners,
  shouldShowAdsForUser,
} = await import('./ad');

describe('isAdsEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when ads_enabled is { enabled: true }', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: true } }]);

    const result = await isAdsEnabled();
    expect(result).toBe(true);
  });

  it('should return false when ads_enabled is { enabled: false }', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: false } }]);

    const result = await isAdsEnabled();
    expect(result).toBe(false);
  });

  it('should return false when row does not exist', async () => {
    mockLimit.mockResolvedValue([]);

    const result = await isAdsEnabled();
    expect(result).toBe(false);
  });

  it('should return false when DB query throws an exception (fallback)', async () => {
    mockLimit.mockRejectedValue(new Error('DB connection failed'));

    const result = await isAdsEnabled();
    expect(result).toBe(false);
  });

  it('should return false when DB query exceeds timeout (withTimeout fallback)', async () => {
    vi.useFakeTimers();
    mockLimit.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve([{ value: { enabled: true } }]), 10000))
    );

    const resultPromise = isAdsEnabled();
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result).toBe(false);
    vi.useRealTimers();
  });
});

describe('getAdBannerBySlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return config when an active banner exists', async () => {
    mockLimit.mockResolvedValue([
      {
        href: 'https://example.com',
        imagePath: '/images/ad.png',
        alt: 'Test Ad',
        width: 728,
        height: 90,
        isActive: true,
      },
    ]);

    const result = await getAdBannerBySlot('header');
    expect(result).toEqual({
      href: 'https://example.com',
      imagePath: '/images/ad.png',
      alt: 'Test Ad',
      width: 728,
      height: 90,
    });
  });

  it('should return null when no banner exists', async () => {
    mockLimit.mockResolvedValue([]);

    const result = await getAdBannerBySlot('header');
    expect(result).toBeNull();
  });

  it('should return null when banner is inactive', async () => {
    mockLimit.mockResolvedValue([
      {
        href: 'https://example.com',
        imagePath: '/images/ad.png',
        alt: 'Test Ad',
        width: 728,
        height: 90,
        isActive: false,
      },
    ]);

    const result = await getAdBannerBySlot('header');
    expect(result).toBeNull();
  });

  it('should return null when DB query throws an exception (fallback)', async () => {
    mockLimit.mockRejectedValue(new Error('DB connection failed'));

    const result = await getAdBannerBySlot('header');
    expect(result).toBeNull();
  });

  it('should return null when DB query exceeds timeout (withTimeout fallback)', async () => {
    vi.useFakeTimers();
    mockLimit.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve([
                {
                  href: 'https://example.com',
                  imagePath: '/images/ad.png',
                  alt: 'Test Ad',
                  width: 728,
                  height: 90,
                  isActive: true,
                },
              ]),
            10000
          )
        )
    );

    const resultPromise = getAdBannerBySlot('header');
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result).toBeNull();
    vi.useRealTimers();
  });
});

describe('getAdsEnabledDirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when ads_enabled is true', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: true } }]);

    const result = await getAdsEnabledDirect();
    expect(result).toBe(true);
  });

  it('should return false when row does not exist', async () => {
    mockLimit.mockResolvedValue([]);

    const result = await getAdsEnabledDirect();
    expect(result).toBe(false);
  });

  it('should return false when DB query throws an exception (fallback)', async () => {
    mockLimit.mockRejectedValue(new Error('DB connection failed'));

    const result = await getAdsEnabledDirect();
    expect(result).toBe(false);
  });
});

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

  it('should return false when ads are disabled globally', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: false } }]);

    const result = await shouldShowAdsForUser('user-123');
    expect(result).toBe(false);
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
  });

  it('should return false when ads_enabled setting row does not exist', async () => {
    mockLimit.mockResolvedValue([]);

    const result = await shouldShowAdsForUser('user-123');
    expect(result).toBe(false);
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
  });

  it('should return true for unauthenticated user (null) when ads enabled', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: true } }]);

    const result = await shouldShowAdsForUser(null);
    expect(result).toBe(true);
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
  });

  it('should not check subscription for null userId (short-circuit)', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: true } }]);

    await shouldShowAdsForUser(null);
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
  });

  it('should return false for user with active subscription', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: true } }]);
    mockHasActiveSubscription.mockResolvedValue(true);

    const result = await shouldShowAdsForUser('user-123');
    expect(result).toBe(false);
    expect(mockHasActiveSubscription).toHaveBeenCalledWith('user-123');
  });

  it('should return true for user without active subscription and no grant', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: true } }]);
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(false);

    const result = await shouldShowAdsForUser('user-456');
    expect(result).toBe(true);
    expect(mockHasActiveSubscription).toHaveBeenCalledWith('user-456');
    expect(mockHasActiveGrant).toHaveBeenCalledWith('user-456', 'ad_free');
  });

  it('should return false when user has active ad_free grant', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: true } }]);
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(true);

    const result = await shouldShowAdsForUser('user-789');
    expect(result).toBe(false);
    expect(mockHasActiveGrant).toHaveBeenCalledWith('user-789', 'ad_free');
  });

  it('should return false for null userId when ads are disabled', async () => {
    mockLimit.mockResolvedValue([{ value: { enabled: false } }]);

    const result = await shouldShowAdsForUser(null);
    expect(result).toBe(false);
  });

  it('should return false when isAdsEnabled throws (DB failure)', async () => {
    mockLimit.mockRejectedValue(new Error('DB connection failed'));

    const result = await shouldShowAdsForUser('user-123');
    expect(result).toBe(false);
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
  });
});
