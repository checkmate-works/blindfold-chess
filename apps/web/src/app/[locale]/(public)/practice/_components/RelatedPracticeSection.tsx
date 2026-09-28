import { Fragment } from 'react';

import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getNativeTileCreatives } from '@/lib/ads/ad';
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

type Props = {
  locale: Locale;
  /** Route segment of the module the page is about, e.g. `diagonal-quiz`. */
  practiceId: string;
  /** The pool the grid's native tile is drawn from. */
  adSlot: AdSlot;
};

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
 *
 * Reads the viewer-independent pool, like `/practice`, so the pages it sits
 * on stay prerendered; the `bfc_ads_hidden` cookie's CSS rule on the tile's
 * `.ad-slot-wrapper` is what hides it from an ad-free reader.
 */
export async function RelatedPracticeSection({ locale, practiceId, adSlot }: Props) {
  const self = PRACTICE_CATALOG.find((entry) => entry.id === practiceId);
  const related = relatedPractices(practiceId);
  if (!self || related.length === 0) return null;

  const [t, levelLabels, items, creatives] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.relatedPractice' }),
    getPracticeLevelLabels(locale),
    buildPracticeCards(locale, related),
    getNativeTileCreatives(adSlot, locale),
  ]);
  const creative = creatives[0];

  return (
    <section className="space-y-4">
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
