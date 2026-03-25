import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsAdsEnabled = vi.fn();
const mockGetAdBannerBySlot = vi.fn();

vi.mock('@/lib/ad', () => ({
  isAdsEnabled: (...args: unknown[]) => mockIsAdsEnabled(...args),
  getAdBannerBySlot: (...args: unknown[]) => mockGetAdBannerBySlot(...args),
}));

vi.mock('server-only', () => ({}));

const { GET } = await import('./route');

function createRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/ad-banners');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url);
}

describe('GET /api/ad-banners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when slot parameter is missing', async () => {
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({ error: 'slot is required' });
  });

  it('should return { data: null } when ads are disabled', async () => {
    mockIsAdsEnabled.mockResolvedValue(false);

    const request = createRequest({ slot: 'header' });
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ data: null });
    expect(mockGetAdBannerBySlot).not.toHaveBeenCalled();
  });

  it('should return banner data when ads are enabled and banner exists', async () => {
    const bannerConfig = {
      href: 'https://example.com',
      imagePath: '/images/ad.png',
      alt: 'Test Ad',
      width: 728,
      height: 90,
    };
    mockIsAdsEnabled.mockResolvedValue(true);
    mockGetAdBannerBySlot.mockResolvedValue(bannerConfig);

    const request = createRequest({ slot: 'header' });
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ data: bannerConfig });
    expect(mockGetAdBannerBySlot).toHaveBeenCalledWith('header');
  });

  it('should return { data: null } when ads are enabled but no banner for slot', async () => {
    mockIsAdsEnabled.mockResolvedValue(true);
    mockGetAdBannerBySlot.mockResolvedValue(null);

    const request = createRequest({ slot: 'nonexistent' });
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ data: null });
  });

  it('should return { data: null } when ads are enabled but getAdBannerBySlot returns undefined', async () => {
    mockIsAdsEnabled.mockResolvedValue(true);
    mockGetAdBannerBySlot.mockResolvedValue(undefined);

    const request = createRequest({ slot: 'header' });
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ data: null });
  });

  it('should set Cache-Control header when ads are disabled', async () => {
    mockIsAdsEnabled.mockResolvedValue(false);

    const request = createRequest({ slot: 'header' });
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=300'
    );
  });

  it('should set Cache-Control header when returning banner data', async () => {
    mockIsAdsEnabled.mockResolvedValue(true);
    mockGetAdBannerBySlot.mockResolvedValue({
      href: 'https://example.com',
      imagePath: '/images/ad.png',
      alt: 'Test Ad',
      width: 728,
      height: 90,
    });

    const request = createRequest({ slot: 'header' });
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=300'
    );
  });

  it('should correctly pass the slot parameter to getAdBannerBySlot', async () => {
    mockIsAdsEnabled.mockResolvedValue(true);
    mockGetAdBannerBySlot.mockResolvedValue(null);

    const request = createRequest({ slot: 'sidebar-wide' });
    await GET(request);

    expect(mockGetAdBannerBySlot).toHaveBeenCalledWith('sidebar-wide');
  });
});
