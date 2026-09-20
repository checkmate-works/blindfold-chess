import { unstable_cache } from 'next/cache';

import { IS_LOCAL_DEV } from '@/config';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { AD_CREATIVES_CACHE_TAG } from '@/lib/cache-tags';
import { adCreativeTranslations, adCreatives, db } from '@/lib/db';

import type { Locale } from '@/app/[locale]/_lib/types';

import { hasAdFreeEntitlement } from './ad-free-entitlement';
import type { CreativeCopy } from './copy';
import { copyFromTranslationRows, resolveNativeCopy } from './copy';
import type { AdKind, AdSlot } from './registry';
import { withCreativeSubId } from './subid';
import type { NativeCardThumbnail } from './thumbnail';
import { thumbnailFromColumns } from './thumbnail';

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
 * The stored copy of the given creatives, keyed by creative id. A creative
 * with no translation rows is absent from the map; callers that render it
 * substitute empty copy, which the validator forbids saving in the first
 * place.
 */
export async function getAdCreativeCopy(
  ids: readonly string[]
): Promise<Map<string, CreativeCopy>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      creativeId: adCreativeTranslations.creativeId,
      locale: adCreativeTranslations.locale,
      title: adCreativeTranslations.title,
      description: adCreativeTranslations.description,
    })
    .from(adCreativeTranslations)
    .where(inArray(adCreativeTranslations.creativeId, [...ids]));
  return copyFromTranslationRows(rows);
}

const EMPTY_COPY: CreativeCopy = { title: {}, description: {} };

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
 * A slot's active, priority-ordered creatives with their copy in every
 * locale, the thumbnail already in the renderers' shape, and the
 * kind-specific columns as stored. Cached per slot so ad-bearing pages stay
 * static/ISR: the pool is baked at build/revalidate and refreshed by
 * `revalidateTag(AD_CREATIVES_CACHE_TAG)` on admin writes; the per-user hide
 * stays on the cookie/CSS layer.
 *
 * The tag is what actually keeps the pool fresh — every mutation path goes
 * through `revalidateAdCreatives`, so an edit is visible within the minute
 * whatever this interval says. The interval is only the backstop, and it is
 * a day rather than the five minutes it used to be because a route's
 * effective `revalidate` is the minimum over every data-cache entry its
 * render reads: a five-minute pool silently pulled each static surface that
 * shows an ad down to a five-minute ISR interval, whatever that page had
 * chosen for itself. Both static ad surfaces have longer budgets on
 * purpose — the glossary a week, `/practice` an hour for the daily puzzle —
 * and ISR writes are metered.
 */
export type ActiveCreative = {
  id: string;
  kind: AdKind;
  href: string;
  sortOrder: number;
  icon: string | null;
  avatarImagePath: string | null;
  avatarAlt: string | null;
  thumbnail: NativeCardThumbnail;
  copy: CreativeCopy;
};

const getActiveCreativesCached = unstable_cache(
  async (slot: string): Promise<ActiveCreative[]> => {
    try {
      const rows = await queryActiveCreatives(slot);
      const copyById = await getAdCreativeCopy(rows.map((row) => row.id));
      return rows.map((row) => ({
        id: row.id,
        kind: row.kind as AdKind,
        href: row.href,
        sortOrder: row.sortOrder,
        icon: row.icon,
        avatarImagePath: row.avatarImagePath,
        avatarAlt: row.avatarAlt,
        thumbnail: thumbnailFromColumns(row),
        copy: copyById.get(row.id) ?? EMPTY_COPY,
      }));
    } catch (error) {
      console.warn('Failed to fetch active ad creatives:', error);
      return [];
    }
  },
  ['active-ad-creatives'],
  { tags: [AD_CREATIVES_CACHE_TAG], revalidate: 60 * 60 * 24 }
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
 *
 * A slot binds exactly one kind (`AD_SLOTS`), so every row in the pool is
 * expected to be a card; the kind test narrows the row rather than filters
 * the pool.
 */
export async function getNativeAdCreatives(slot: AdSlot, locale: Locale): Promise<NativeAdView[]> {
  const creatives = await getActiveCreatives(slot);
  return creatives.flatMap((c) => {
    if (c.kind !== 'native_card') return [];
    const { title, description } = resolveNativeCopy(c.copy, locale);
    return [
      {
        id: c.id,
        href: withCreativeSubId(c.href, c.id),
        avatarImagePath: c.avatarImagePath,
        avatarAlt: c.avatarAlt ?? '',
        title,
        description,
        thumbnail: c.thumbnail,
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
 * read-time copy resolution — only the narrowing and the resulting shape
 * differ. A tile row always has an emoji (`ad_creatives_chk_fields_for_kind`);
 * the null test exists to narrow the column's type, not because a row can
 * lack one.
 */
export async function getNativeTileCreatives(
  slot: AdSlot,
  locale: Locale
): Promise<NativeTileView[]> {
  const creatives = await getActiveCreatives(slot);
  return creatives.flatMap((c) => {
    if (c.kind !== 'native_tile' || c.icon === null) return [];
    const { title, description } = resolveNativeCopy(c.copy, locale);
    return [
      {
        id: c.id,
        href: withCreativeSubId(c.href, c.id),
        icon: c.icon,
        title,
        description,
        thumbnail: c.thumbnail,
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
