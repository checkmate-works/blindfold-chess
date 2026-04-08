import { unstable_cache } from 'next/cache';

import { eq } from 'drizzle-orm';

import { getOptionalUser } from '@/lib/auth';
import { adBanners, db, siteSettings } from '@/lib/db';
import { withTimeout } from '@/lib/db-timeout';
import { hasActiveSubscription } from '@/lib/subscription';
import { hasActiveGrant } from '@/lib/user-grants';

export type AdBannerConfig = {
  href: string;
  imagePath: string;
  alt: string;
  width: number;
  height: number;
};

async function fetchAdsEnabledFlag(): Promise<boolean> {
  const [row] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, 'ads_enabled'))
    .limit(1);
  if (!row) return false;
  const value = row.value as { enabled?: boolean };
  return value.enabled === true;
}

function toAdBannerConfig(row: {
  href: string;
  imagePath: string;
  alt: string;
  width: number;
  height: number;
}): AdBannerConfig {
  return {
    href: row.href,
    imagePath: row.imagePath,
    alt: row.alt,
    width: row.width,
    height: row.height,
  };
}

export const isAdsEnabled = unstable_cache(
  async (): Promise<boolean> => {
    try {
      return await withTimeout(fetchAdsEnabledFlag());
    } catch (error) {
      console.warn('Failed to fetch ads_enabled setting:', error);
      return false;
    }
  },
  ['ads-enabled'],
  { tags: ['ads-config'], revalidate: 60 }
);

/**
 * Pure decision function: determine whether ads should be shown for a given user.
 *
 * - `null` userId (unauthenticated): always show ads (if globally enabled)
 * - Authenticated user with active subscription: hide ads
 * - Authenticated user without subscription: show ads
 */
export async function shouldShowAdsForUser(userId: string | null): Promise<boolean> {
  const adsEnabled = await isAdsEnabled();
  if (!adsEnabled) return false;

  if (!userId) return true; // Unauthenticated -> show ads

  const [hasSub, hasGrant] = await Promise.all([
    hasActiveSubscription(userId),
    hasActiveGrant(userId, 'ad_free'),
  ]);

  if (hasSub || hasGrant) return false;

  return true;
}

/**
 * Convenience wrapper that resolves the current session user and delegates
 * to `shouldShowAdsForUser`.
 *
 * Existing callers can continue using this function without changes.
 */
export async function shouldShowAds(): Promise<boolean> {
  const user = await getOptionalUser();
  return shouldShowAdsForUser(user?.id ?? null);
}

export const getAdBannerBySlot = unstable_cache(
  async (slot: string): Promise<AdBannerConfig | null> => {
    try {
      const [row] = await withTimeout(
        db.select().from(adBanners).where(eq(adBanners.slot, slot)).limit(1)
      );

      if (!row || !row.isActive) return null;

      return toAdBannerConfig(row);
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

      return [toAdBannerConfig(row)];
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
    return await fetchAdsEnabledFlag();
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
