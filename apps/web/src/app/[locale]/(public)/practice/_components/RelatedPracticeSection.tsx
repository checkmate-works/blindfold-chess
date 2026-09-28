import { Fragment } from 'react';

import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import {
  type NativeTileView,
  getNativeTileCreatives,
  resolveNativeTileCreatives,
} from '@/lib/ads/ad';
import { withSingleNativeAd } from '@/lib/ads/placement';
import type { AdSlot } from '@/lib/ads/registry';

import {
  PRACTICE_CATALOG,
  relatedPractices,
} from '@/app/[locale]/(public)/practice/_lib/practice-catalog';
import {
  buildPracticeCards,
  getPracticeLevelLabels,
} from '@/app/[locale]/(public)/practice/_lib/practice-catalog-cards';
import { PRACTICE_LEVEL_PARAM } from '@/app/[locale]/(public)/practice/_lib/practice-levels';
import { SectionTitle } from '@/app/[locale]/_components';
import { NativeAdTile } from '@/app/[locale]/_components/NativeAdTile';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Where the grid's native tile comes from.
 *
 * - `{ slot }` — a prerendered page, which must not read the viewer: the
 *   viewer-independent pool is read, and the `bfc_ads_hidden` cookie's CSS
 *   rule on the tile's `.ad-slot-wrapper` hides it from an ad-free reader.
 * - `{ slot, userId }` — a page that already knows its viewer: the
 *   entitlement-gated read, so an ad-free viewer gets no tile at all.
 * - `{ creative }` — already resolved by the caller, for a page that renders
 *   several of these grids and should not repeat the read for each.
 */
export type RelatedPracticeAd =
  | { slot: AdSlot; userId?: undefined }
  | { slot: AdSlot; userId: string | null }
  | { creative: NativeTileView | null };

type Props = {
  locale: Locale;
  /** Route segment of the module the page is about, e.g. `diagonal-quiz`. */
  practiceId: string;
  ad: RelatedPracticeAd;
  /** Extra classes for the section, for a surface that spaces by margin. */
  className?: string;
};

async function resolveAd(ad: RelatedPracticeAd, locale: Locale): Promise<NativeTileView | null> {
  if ('creative' in ad) return ad.creative;
  const creatives =
    ad.userId === undefined
      ? await getNativeTileCreatives(ad.slot, locale)
      : await resolveNativeTileCreatives(ad.slot, ad.userId, locale);
  return creatives[0] ?? null;
}

/**
 * The other modules in this one's band, as the practice list draws them, with
 * one native tile among them and a link to the list filtered to the band.
 *
 * "Related" is the band on purpose: it is the grouping the practice list
 * already offers as a filter, so the grid is exactly what the reader would
 * get by choosing this module's level there — and the link under it goes to
 * that filtered list for the rest.
 *
 * A band holds two or three modules, so the grid is short and the tile is a
 * large share of it. That is accepted: the tile is drawn as one more card of
 * the grid, and a short grid is still one that a reader who came here to
 * check a record can pick something from.
 */
export async function RelatedPracticeSection({ locale, practiceId, ad, className }: Props) {
  const self = PRACTICE_CATALOG.find((entry) => entry.id === practiceId);
  const related = relatedPractices(practiceId);
  if (!self || related.length === 0) return null;

  const [t, levelLabels, items, creative] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.relatedPractice' }),
    getPracticeLevelLabels(locale),
    buildPracticeCards(locale, related),
    resolveAd(ad, locale),
  ]);

  return (
    <section className={`space-y-4 ${className ?? ''}`.trim()}>
      <SectionTitle>{t('title')}</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {withSingleNativeAd(
          items.map((item) => <Fragment key={item.key}>{item.card}</Fragment>),
          creative ? <NativeAdTile key="native-ad" creative={creative} /> : null
        )}
      </div>
      <div className="text-center">
        <Link
          href={`/practice?${PRACTICE_LEVEL_PARAM}=${self.level}`}
          locale={locale}
          className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}
        >
          {t('viewAll', { level: levelLabels[self.level] })}
        </Link>
      </div>
    </section>
  );
}
