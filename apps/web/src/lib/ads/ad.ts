import { unstable_cache } from 'next/cache';

import { and, asc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import { adCreatives, db } from '@/lib/db';
import { hasActiveGrant } from '@/lib/users/user-grants';

import { isNativeCardPayload, resolveLocalizedText } from './payload';
import type { LocalizedText } from './payload';
import { FEED_NATIVE_AD_SLOT } from './registry';
import type { AdKind, AdSlot } from './registry';

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

async function queryActiveCreatives(slot: string) {
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
 * A slot's active, in-schedule, priority-ordered creatives — the raw pool the
 * `<AdSlot>` waterfall picks from. `payload` is `unknown`; render sites narrow
 * it with the kind guards in `@/lib/ads/payload`. Cached per slot (tag +
 * time-bounded) so ad-bearing pages stay static/ISR: the pool is baked at
 * build/revalidate and refreshed by `revalidateTag(AD_CREATIVES_CACHE_TAG)`
 * on admin writes; the per-user hide stays on the cookie/CSS layer.
 */
export type ActiveCreative = {
  id: string;
  kind: AdKind;
  href: string;
  sortOrder: number;
  payload: unknown;
};

const getActiveCreativesCached = unstable_cache(
  async (slot: string): Promise<ActiveCreative[]> => {
    try {
      const rows = await queryActiveCreatives(slot);
      return rows.map((row) => ({
        id: row.id,
        kind: row.kind as AdKind,
        href: row.href,
        sortOrder: row.sortOrder,
        payload: row.payload,
      }));
    } catch (error) {
      console.warn('Failed to fetch active ad creatives:', error);
      return [];
    }
  },
  ['active-ad-creatives'],
  { tags: [AD_CREATIVES_CACHE_TAG], revalidate: 300 }
);

export function getActiveCreatives(slot: AdSlot): Promise<ActiveCreative[]> {
  return getActiveCreativesCached(slot);
}

/**
 * Feed-slot view: the active native-card creatives, mapped to the
 * serializable `NativeAdView` the client `FeedClient` rotates through.
 * Delegates to the cached `getActiveCreatives`, so home/topics (both
 * `force-dynamic`) share the same tag-invalidated pool as every other slot.
 */
export async function getFeedNativeAdCreatives(): Promise<NativeAdView[]> {
  const creatives = await getActiveCreatives(FEED_NATIVE_AD_SLOT);
  return creatives.flatMap((c) => {
    if (!isNativeCardPayload(c.payload)) return [];
    return [
      {
        id: c.id,
        href: c.href,
        avatarImagePath: c.payload.avatarImagePath,
        avatarAlt: c.payload.avatarAlt,
        title: c.payload.title,
        description: c.payload.description,
      },
    ];
  });
}

export { resolveLocalizedText };
