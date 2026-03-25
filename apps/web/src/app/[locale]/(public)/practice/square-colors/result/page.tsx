import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { shouldShowAds } from '@/lib/ad';

import { getLeaderboard } from '@/app/[locale]/(public)/leaderboard/_actions/getLeaderboard';
import { buildDetailPath } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './ResultClient';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/square-colors/result' }),
    title: `${t('squareColors.title')} - ${t('result')}`,
  };
}

export default async function SquareColorsResultPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const leaderboardResult = await getLeaderboard('square_colors', 'default', 'weekly', 1);
  const leaderboardRows = leaderboardResult.rows.slice(0, 3);
  const leaderboardDetailPath = buildDetailPath('weekly', 'square_colors', 'default');
  const showAds = await shouldShowAds();

  return (
    <Suspense>
      <ResultClient
        locale={locale}
        adBannerWide={showAds ? <AdBanner slot="banner-wide" locale={locale} /> : null}
        adBannerStandard={showAds ? <AdBanner slot="banner-standard" locale={locale} /> : null}
        leaderboardRows={leaderboardRows}
        leaderboardDetailPath={leaderboardDetailPath}
      />
    </Suspense>
  );
}
