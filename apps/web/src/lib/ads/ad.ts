import { unstable_cache } from 'next/cache';

import { and, asc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import { adCreatives, db } from '@/lib/db';
import { hasActiveGrant } from '@/lib/users/user-grants';

import { isNativeCardPayload, resolveLocalizedText } from './payload';
import type { LocalizedText } from './payload';
import { FEED_NATIVE_AD_SLOT } from './registry';
import type { AdSlot } from './registry';

/** Cache tag invalidated by every admin creative mutation. */
export const AD_CREATIVES_CACHE_TAG = 'ad-creatives';

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

/** Admin read — every creative regardless of active/schedule state. */
export async function getAllAdCreatives() {
  try {
    return await db.select().from(adCreatives).orderBy(adCreatives.slot, adCreatives.sortOrder);
  } catch (error) {
    console.warn('Failed to fetch ad creatives:', error);
    return [];
  }
}

/**
 * Serializable view of a native-card creative, safe to pass from a Server
 * Component into the client `FeedClient`. Localized fields stay as maps;
 * the card resolves them per-viewer via `resolveLocalizedText`.
 */
export type NativeAdView = {
  id: string;
  href: string;
  avatarImagePath: string | null;
  avatarAlt: string;
  title: LocalizedText;
  description: LocalizedText;
};

async function queryActiveCreatives(slot: AdSlot) {
  return db
    .select()
    .from(adCreatives)
    .where(
      and(
        eq(adCreatives.slot, slot),
        eq(adCreatives.isActive, true),
        or(isNull(adCreatives.startAt), lte(adCreatives.startAt, sql`now()`)),
        or(isNull(adCreatives.endAt), gt(adCreatives.endAt, sql`now()`))
      )
    )
    .orderBy(asc(adCreatives.sortOrder), asc(adCreatives.createdAt));
}

/**
 * Public read — active, in-window native-card creatives for the feed slot.
 * The very first consumer of the `is_active` / `start_at` / `end_at`
 * columns; the old banner reader ignored all three. Cached (tag +
 * time-bounded) because both home and topics feeds are `force-dynamic` and
 * hit this on every request; admin mutations call
 * `revalidateTag(AD_CREATIVES_CACHE_TAG)`. Schedule windows are therefore
 * honored within the revalidate interval, which is ample for ad rotation.
 */
export const getFeedNativeAdCreatives = unstable_cache(
  async (): Promise<NativeAdView[]> => {
    try {
      const rows = await queryActiveCreatives(FEED_NATIVE_AD_SLOT);
      return rows.flatMap((row) => {
        if (!isNativeCardPayload(row.payload)) return [];
        return [
          {
            id: row.id,
            href: row.href,
            avatarImagePath: row.payload.avatarImagePath,
            avatarAlt: row.payload.avatarAlt,
            title: row.payload.title,
            description: row.payload.description,
          },
        ];
      });
    } catch (error) {
      console.warn('Failed to fetch feed native-ad creatives:', error);
      return [];
    }
  },
  ['feed-native-ad-creatives'],
  { tags: [AD_CREATIVES_CACHE_TAG], revalidate: 300 }
);

export { resolveLocalizedText };
