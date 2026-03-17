import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLimit = vi.fn();
const mockOrderBy = vi.fn();

vi.mock('./db', () => ({
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

const { isAdsEnabled, getAdBannerBySlot, getAdsEnabledDirect, getAllAdBanners } = await import(
  './ad'
);

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
