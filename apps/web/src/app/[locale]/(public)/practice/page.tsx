/**
 * Practice List (`/practice`)
 *
 * @description
 * Lists every practice module as a card carrying the module's emoji, the rank
 * it contributes toward, and an example band showing the question it asks
 * (`PracticeCardVisual`). One grid, narrowed by difficulty through
 * `PracticeLevelFilter` rather than split under per-level headings — the
 * headings pushed the later bands below the fold on a phone, and a reader
 * looking for "something at my level" had to scroll past the other bands to
 * find out what was in theirs.
 *
 * Leads with the Daily Puzzle card (the same one the signed-in dashboard
 * shows) so the page offers a concrete thing to do before the module grid.
 *
 * Uses PRACTICE_EMOJIS as the single source of truth for icons.
 *
 * @flow
 * - Daily Puzzle: today's puzzle, seeded on the UTC date
 * - Beginner: Square Colors, Coordinate Quiz, Legal Moves
 * - Intermediate: Diagonal Quiz, Board Symmetry, Route Planner
 * - Advanced: Position Memory, Puzzle
 * - Expert: Knight's Tour, Recall
 * - Introduction: Algebraic Notation, FEN Reconstruction, Quadrant Anchors
 *
 * The bands each say something the others do not, so the list keeps all
 * five. Merging them to fit the filter into one row on a phone was tried
 * (2026-09) and cost more than it saved: Expert inside Advanced hid which
 * two modules are the hard ones, and Introduction inside Beginner both lost
 * "this is reference material, not a step" and moved the notation modules
 * to the top of the unfiltered grid, where the list had always ended with
 * them. The filter wraps instead. See `PRACTICE_LEVELS`.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { DailyPuzzleCard } from '@/app/_components/DailyPuzzleCard';
import { SITE_URL } from '@/config';

import { getNativeTileCreatives } from '@/lib/ads/ad';
import { PRACTICE_GRID_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { JsonLd, generateItemListSchema } from '@/lib/seo/jsonld';

import { PracticeLevelFilter } from '@/app/[locale]/(public)/practice/_components/PracticeLevelFilter';
import { PRACTICE_CATALOG } from '@/app/[locale]/(public)/practice/_lib/practice-catalog';
import {
  buildPracticeCards,
  getPracticeLevelLabels,
} from '@/app/[locale]/(public)/practice/_lib/practice-catalog-cards';
import { ListLink, ListLinkContainer, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { NativeAdTile } from '@/app/[locale]/_components/NativeAdTile';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

// Lands at 1h in the route table, not the layout's week, via `DailyPuzzleCard`
// → `getDailyPuzzle`. Deliberate; see `selectDailyPuzzle`.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.practice', path: 'practice' });
}

export default async function PracticePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  // The viewer-independent read, not `resolveNativeAds`: this page is
  // prerendered, and resolving the viewer's entitlement here would read
  // `cookies()` and make it dynamic. Hiding the tile from a paying reader is
  // the `bfc_ads_hidden` cookie's job, through the CSS rule on the
  // `.ad-slot-wrapper` that `NativeAdTile` owns.
  const nativeAdCreatives = await getNativeTileCreatives(PRACTICE_GRID_NATIVE_AD_SLOT, locale);
  const nativeAd = nativeAdCreatives[0] ?? null;

  const itemListItems = PRACTICE_CATALOG.map((practice) => ({
    name: t(practice.titleKey),
    url: `${SITE_URL}/${locale}/practice/${practice.id}`,
  }));

  const levelLabels = await getPracticeLevelLabels(locale);

  // Every card is rendered here, on the server, and the filter only decides
  // which of them to show — so the prerendered HTML carries the whole list.
  const items = await buildPracticeCards(locale, PRACTICE_CATALOG);

  return (
    <>
      <JsonLd data={generateItemListSchema(itemListItems)} />
      <PageLayout
        title={t('practice.title')}
        locale={locale}
        breadcrumb={[{ label: t('navigation.practice') }]}
      >
        <DailyPuzzleCard locale={locale} variant="compact" />

        <PracticeLevelFilter
          items={items}
          basePath={`/${locale}/practice`}
          levelLabels={levelLabels}
          allLabel={t('practice.filter.all')}
          filterLabel={t('practice.filter.label')}
          listHeading={t('practice.modulesTitle')}
          nativeAd={nativeAd && <NativeAdTile key="native-ad" creative={nativeAd} />}
        />

        <section className="space-y-4">
          <SectionTitle>{t('practice.related')}</SectionTitle>
          <ListLinkContainer>
            <ListLink href="/dojo" icon="🥋" title={t('practice.viewDojo')} locale={locale} />
            <ListLink
              href="/leaderboard/score/all-time"
              icon="🏆"
              title={t('practice.viewLeaderboard')}
              locale={locale}
            />
          </ListLinkContainer>
        </section>
      </PageLayout>
    </>
  );
}
