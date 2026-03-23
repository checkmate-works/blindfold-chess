import { unstable_cache } from 'next/cache';

import { eq } from 'drizzle-orm';

import { adBanners, db, siteSettings } from '@/lib/db';

const DB_QUERY_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), ms)),
  ]);
}

export type AdBannerConfig = {
  href: string;
  imagePath: string;
  alt: string;
  width: number;
  height: number;
};

export const isAdsEnabled = unstable_cache(
  async (): Promise<boolean> => {
    try {
      const [row] = await withTimeout(
        db
          .select({ value: siteSettings.value })
          .from(siteSettings)
          .where(eq(siteSettings.key, 'ads_enabled'))
          .limit(1),
        DB_QUERY_TIMEOUT_MS
      );

      if (!row) return false;

      const value = row.value as { enabled?: boolean };
      return value.enabled === true;
    } catch (error) {
      console.warn('Failed to fetch ads_enabled setting:', error);
      return false;
    }
  },
  ['ads-enabled'],
  { tags: ['ads-config'], revalidate: 60 }
);

export const getAdBannerBySlot = unstable_cache(
  async (slot: string): Promise<AdBannerConfig | null> => {
    try {
      const [row] = await withTimeout(
        db.select().from(adBanners).where(eq(adBanners.slot, slot)).limit(1),
        DB_QUERY_TIMEOUT_MS
      );

      if (!row || !row.isActive) return null;

      return {
        href: row.href,
        imagePath: row.imagePath,
        alt: row.alt,
        width: row.width,
        height: row.height,
      };
    } catch (error) {
      console.warn('Failed to fetch ad banner for slot:', slot, error);
      return null;
    }
  },
  ['ad-banner-by-slot'],
  { tags: ['ads-config'], revalidate: 60 }
);

export const getAdBannersForFeed = unstable_cache(
  async (): Promise<AdBannerConfig[]> => {
    try {
      const rows = await withTimeout(
        db
          .select()
          .from(adBanners)
          .where(eq(adBanners.isActive, true))
          .orderBy(adBanners.sortOrder),
        DB_QUERY_TIMEOUT_MS
      );

      return rows.map((row) => ({
        href: row.href,
        imagePath: row.imagePath,
        alt: row.alt,
        width: row.width,
        height: row.height,
      }));
    } catch (error) {
      console.warn('Failed to fetch ad banners for feed:', error);
      return [];
    }
  },
  ['ad-banners-feed'],
  { tags: ['ads-config'], revalidate: 60 }
);

// No-cache versions for admin pages (always show latest data)
export async function getAdsEnabledDirect(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, 'ads_enabled'))
      .limit(1);

    if (!row) return false;

    const value = row.value as { enabled?: boolean };
    return value.enabled === true;
  } catch (error) {
    console.warn('Failed to fetch ads_enabled setting (direct):', error);
    return false;
  }
}

export async function getAllAdBanners() {
  try {
    return await db.select().from(adBanners).orderBy(adBanners.sortOrder);
  } catch (error) {
    console.warn('Failed to fetch all ad banners:', error);
    return [];
  }
}
