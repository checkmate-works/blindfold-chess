import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';

import { IS_LOCAL_DEV } from '@/config';
import { and, asc, eq } from 'drizzle-orm';

import { AD_CREATIVES_CACHE_TAG } from '@/lib/cache-tags';
import { adCreatives, db } from '@/lib/db';

import { hasAdFreeEntitlement } from './ad-free-entitlement';
import { filterByCountry, getRequestCountry } from './country';
import type { BannerPayload, NativeCardThumbnail } from './payload';
import { isBannerPayload, isNativeCardPayload, resolveNativeThumbnail } from './payload';
import type { AdKind, AdSlot } from './registry';

/**
 * Pure decision function: determine whether ads should be shown for a given user.
 *
 * - `null` userId (unauthenticated): always show ads
 * - Authenticated user with an ad-free entitlement: hide ads
 *
 * The entitlement sources themselves (subscription, grant, …) live in
 * {@link hasAdFreeEntitlement} — the single decision point shared with the
 * `bfc_ads_hidden` cookie layer.
 */
export async function shouldShowAdsForUser(userId: string | null): Promise<boolean> {
  return !(await hasAdFreeEntitlement(userId));
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
 * Component into the client `FeedClient`.
 */
export type NativeAdView = {
  id: string;
  href: string;
  avatarImagePath: string | null;
  avatarAlt: string;
  title: string;
  description: string;
  thumbnail: NativeCardThumbnail;
};

async function queryActiveCreatives(slot: string) {
  return db
    .select()
    .from(adCreatives)
    .where(and(eq(adCreatives.slot, slot), eq(adCreatives.isActive, true)))
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
  targetCountry: string | null;
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
        targetCountry: row.targetCountry,
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
 * Native-card view for a given slot: the active native-card creatives (filtered
 * to the visitor's country), mapped to the serializable `NativeAdView` that
 * client card renderers use. Delegates to the cached `getActiveCreatives`, so
 * every consuming surface (the home/topics feed, the puzzle and
 * position-memory lists — all `force-dynamic`, so reading the geo header
 * server-side is free) shares the same tag-invalidated pool. `country` comes
 * from `getRequestCountry(headers())`; null = geo unknown (only global
 * creatives qualify).
 */
export async function getNativeAdCreatives(
  slot: AdSlot,
  country: string | null
): Promise<NativeAdView[]> {
  const creatives = filterByCountry(await getActiveCreatives(slot), country);
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
        thumbnail: resolveNativeThumbnail(c.payload),
      },
    ];
  });
}

/**
 * The one-call server prologue for a native-card surface: the viewer's ad
 * entitlement (`showAds`, with the `IS_LOCAL_DEV` force-on so placements are
 * testable locally) and — only when ads show at all — the slot's creatives
 * filtered to the request's country. Reads `headers()` for the geo, so callers
 * must be request-scoped (every native-card surface is `force-dynamic`, which
 * makes that read free). Ad-free viewers skip the creative read entirely.
 */
export async function resolveNativeAds(
  slot: AdSlot,
  userId: string | null
): Promise<{ showAds: boolean; creatives: NativeAdView[] }> {
  const showAds = IS_LOCAL_DEV || (await shouldShowAdsForUser(userId));
  if (!showAds) return { showAds: false, creatives: [] };

  const country = getRequestCountry(await headers());
  return { showAds: true, creatives: await getNativeAdCreatives(slot, country) };
}

/** A banner creative as `/api/ad-slot/[slot]` serves it to `AdSlotClient`. */
export type BannerAdView = { href: string; payload: BannerPayload };

/**
 * Banner sibling of {@link getNativeAdCreatives}: a slot's active banner
 * creatives eligible in the visitor's country, kind-narrowed and projected to
 * the serializable view. Keeps both payload projections in this module.
 */
export async function getBannerCreatives(
  slot: AdSlot,
  country: string | null
): Promise<BannerAdView[]> {
  const creatives = filterByCountry(await getActiveCreatives(slot), country);
  return creatives.flatMap((c) =>
    isBannerPayload(c.payload) ? [{ href: c.href, payload: c.payload }] : []
  );
}
