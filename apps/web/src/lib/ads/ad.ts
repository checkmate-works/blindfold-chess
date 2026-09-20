import { unstable_cache } from 'next/cache';

import { IS_LOCAL_DEV } from '@/config';
import { and, asc, eq } from 'drizzle-orm';

import { AD_CREATIVES_CACHE_TAG } from '@/lib/cache-tags';
import { adCreatives, db } from '@/lib/db';

import type { Locale } from '@/app/[locale]/_lib/types';

import { hasAdFreeEntitlement } from './ad-free-entitlement';
import type { NativeCardThumbnail } from './payload';
import {
  isNativeCardPayload,
  isNativeTilePayload,
  resolveNativeCopy,
  resolveNativeThumbnail,
} from './payload';
import type { AdKind, AdSlot } from './registry';
import { withCreativeSubId } from './subid';

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

/**
 * Admin read — every creative, active or not, with `href` exactly as it was
 * entered. The sub-ID tag is a render-time concern (see {@link withCreativeSubId});
 * showing a tagged URL back in the edit form would let it accumulate.
 */
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
 * A slot's active, priority-ordered creatives. `payload` is `unknown`; render
 * sites narrow it with the kind guards in `@/lib/ads/payload`. Cached per slot
 * (tag + time-bounded) so ad-bearing pages stay static/ISR: the pool is baked
 * at build/revalidate and refreshed by `revalidateTag(AD_CREATIVES_CACHE_TAG)`
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
 * Native-card view for a given slot: the active native-card creatives mapped
 * to the serializable `NativeAdView` that client card renderers use. `href`
 * comes out sub-ID tagged, so a click lands in the network's report
 * attributed to this creative. Delegates to the cached `getActiveCreatives`,
 * so every consuming surface (the home/topics feed, the puzzle and
 * position-memory lists) shares the same tag-invalidated pool.
 *
 * Copy is resolved here rather than in the card: `locale` picks the visitor's
 * language out of each creative's per-locale copy (see `resolveNativeCopy`),
 * which leaves `NativeAdView` a flat, already-localized shape the client
 * renderer can take as-is.
 */
export async function getNativeAdCreatives(slot: AdSlot, locale: Locale): Promise<NativeAdView[]> {
  const creatives = await getActiveCreatives(slot);
  return creatives.flatMap((c) => {
    if (!isNativeCardPayload(c.payload)) return [];
    const { title, description } = resolveNativeCopy(c.payload, locale);
    return [
      {
        id: c.id,
        href: withCreativeSubId(c.href, c.id),
        avatarImagePath: c.payload.avatarImagePath,
        avatarAlt: c.payload.avatarAlt,
        title,
        description,
        thumbnail: resolveNativeThumbnail(c.payload),
      },
    ];
  });
}

/**
 * Serializable view of a native-tile creative — the card view plus the emoji
 * and minus the author row, which is the difference between the two shapes.
 */
export type NativeTileView = {
  id: string;
  href: string;
  icon: string;
  title: string;
  description: string;
  thumbnail: NativeCardThumbnail;
};

/**
 * Native-tile view for a given slot. The tile twin of
 * {@link getNativeAdCreatives}: same cached pool, same sub-ID tagging, same
 * read-time copy resolution — only the guard and the resulting shape differ,
 * because the slot's kind decides which payload its creatives hold.
 */
export async function getNativeTileCreatives(
  slot: AdSlot,
  locale: Locale
): Promise<NativeTileView[]> {
  const creatives = await getActiveCreatives(slot);
  return creatives.flatMap((c) => {
    if (!isNativeTilePayload(c.payload)) return [];
    const { title, description } = resolveNativeCopy(c.payload, locale);
    return [
      {
        id: c.id,
        href: withCreativeSubId(c.href, c.id),
        icon: c.payload.icon,
        title,
        description,
        thumbnail: resolveNativeThumbnail(c.payload),
      },
    ];
  });
}

/**
 * The one-call server prologue for a native-card surface: the viewer's ad
 * entitlement (`showAds`, with the `IS_LOCAL_DEV` force-on so placements are
 * testable locally) and — only when ads show at all — the slot's creatives
 * with their copy resolved for `locale`. Ad-free viewers skip the creative
 * read entirely.
 */
export async function resolveNativeAds(
  slot: AdSlot,
  userId: string | null,
  locale: Locale
): Promise<{ showAds: boolean; creatives: NativeAdView[] }> {
  const showAds = IS_LOCAL_DEV || (await shouldShowAdsForUser(userId));
  if (!showAds) return { showAds: false, creatives: [] };

  return { showAds: true, creatives: await getNativeAdCreatives(slot, locale) };
}
