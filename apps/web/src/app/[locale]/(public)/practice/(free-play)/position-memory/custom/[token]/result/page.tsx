import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getNativeThumbCreatives } from '@/lib/ads/ad';
import { POSITION_MEMORY_RESULT_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { loadNextPositions } from '@/lib/positions/next-positions';

import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { NextPositionsSection } from '../../../../_components/NextPositionsSection';
import { SinglePositionResult } from '../../../_components/single-position/SinglePositionResult';
import { SinglePositionResultLoadingSkeleton } from '../../../_components/single-position/SinglePositionResultLoadingSkeleton';
import { resolveCustomProblem } from '../../../_lib/custom-problem';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    token: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  return {
    title: resolveTitle(`${t('title')} - ${t('result')}`, locale),
    robots: { index: false, follow: false },
  };
}

export default async function CustomPositionResultPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  // Validate the token so a tampered/garbage URL 404s instead of rendering an
  // empty result. The run data itself lives entirely in the query string.
  if (!resolveCustomProblem(token)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        {
          label: t('custom.title'),
          href: `/practice/position-memory/custom/${token}`,
        },
        { label: t('result') },
      ]}
      locale={locale}
      density="compact"
    />
  );

  // A token run has no catalog position behind it, so there is no author tier
  // and nothing to exclude — the grid is simply the newest of this catalog.
  // Which is the point of putting it here: this screen used to end at Try
  // Again and Back to list, with nothing to go on to, and a reader who has
  // just rebuilt a board somebody handed them has no other way into the
  // catalog.
  //
  // It shares the saved-position result screen's ad pool rather than taking
  // its own: same catalog, same moment in it. The two axes the thumb pools
  // split on (see `POSITION_MEMORY_RESULT_NATIVE_AD_SLOT`) both read the same
  // here, and whether a DB row backed the run is not something a creative
  // would be written differently for.
  const [nextPositions, nativeAdCreatives] = await Promise.all([
    loadNextPositions(null, 'memory'),
    getNativeThumbCreatives(POSITION_MEMORY_RESULT_NATIVE_AD_SLOT, locale),
  ]);

  return (
    // Fallback covers the soft-navigation gap between loading.tsx resolving and
    // the SinglePositionResult client chunk arriving. That component owns the
    // PagePanel chrome, so without a fallback the page would flash to bare
    // background. Reuse the same skeleton as loading.tsx for a continuous shape.
    <Suspense fallback={<SinglePositionResultLoadingSkeleton />}>
      <SinglePositionResult
        locale={locale}
        sessionPath={`/practice/position-memory/custom/${token}/session`}
        breadcrumb={breadcrumb}
        expInfo={null}
        nextPositions={
          <NextPositionsSection
            positions={nextPositions}
            nativeAdCreatives={nativeAdCreatives}
            locale={locale}
            basePath="/practice/position-memory"
            labels={{ sectionTitle: t('nextProblems') }}
          />
        }
      />
    </Suspense>
  );
}
