import { unstable_cache } from 'next/cache';

import { eq } from 'drizzle-orm';

import { adBanners, db, siteSettings } from '@/lib/db';

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
      const [row] = await db
        .select({ value: siteSettings.value })
        .from(siteSettings)
        .where(eq(siteSettings.key, 'ads_enabled'))
        .limit(1);

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
      const [row] = await db.select().from(adBanners).where(eq(adBanners.slot, slot)).limit(1);

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
