import { hasActiveSubscription } from '@/lib/billing/subscription';
import { adBanners, db } from '@/lib/db';
import { hasActiveGrant } from '@/lib/users/user-grants';

/**
 * Pure decision function: determine whether ads should be shown for a given user.
 *
 * - `null` userId (unauthenticated): always show ads
 * - Authenticated user with active subscription or `ad_free` grant: hide ads
 * - Authenticated user without either: show ads
 */
export async function shouldShowAdsForUser(userId: string | null): Promise<boolean> {
  if (!userId) return true;

  const [hasSub, hasGrant] = await Promise.all([
    hasActiveSubscription(userId),
    hasActiveGrant(userId, 'ad_free'),
  ]);

  return !(hasSub || hasGrant);
}

export async function getAllAdBanners() {
  try {
    return await db.select().from(adBanners).orderBy(adBanners.sortOrder);
  } catch (error) {
    console.warn('Failed to fetch all ad banners:', error);
    return [];
  }
}
