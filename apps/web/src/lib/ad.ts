import { unstable_cache } from 'next/cache';

import { eq } from 'drizzle-orm';

import { getOptionalUser } from '@/lib/auth';
import { adBanners, db, siteSettings } from '@/lib/db';
import { withTimeout } from '@/lib/db-timeout';
import { hasActiveSubscription } from '@/lib/subscription';

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
          .limit(1)
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

/**
 * Determine whether ads should be shown to the current user.
 *
 * Combines the global ads-enabled switch with per-user subscription check.
 * - Unauthenticated users: always show ads (if globally enabled)
 * - Authenticated users with active subscription: hide ads
 * - Authenticated users without subscription: show ads
 *
 * @param userId - Optional user ID. If not provided, fetches from session.
 */
export async function shouldShowAds(userId?: string | null): Promise<boolean> {
  const adsEnabled = await isAdsEnabled();
  if (!adsEnabled) return false;

  // If userId explicitly provided, use it
  if (userId) {
    return !(await hasActiveSubscription(userId));
  }

  // Otherwise, check current session
  const user = await getOptionalUser();
  if (!user) return true; // Unauthenticated -> show ads

  return !(await hasActiveSubscription(user.id));
}

export const getAdBannerBySlot = unstable_cache(
  async (slot: string): Promise<AdBannerConfig | null> => {
    try {
      const [row] = await withTimeout(
        db.select().from(adBanners).where(eq(adBanners.slot, slot)).limit(1)
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
      const banner = await withTimeout(
        db.select().from(adBanners).where(eq(adBanners.slot, 'native-ad')).limit(1)
      );

      const row = banner[0];
      if (!row || !row.isActive) return [];

      return [
        {
          href: row.href,
          imagePath: row.imagePath,
          alt: row.alt,
          width: row.width,
          height: row.height,
        },
      ];
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
