import { Suspense } from 'react';

import { setRequestLocale } from 'next-intl/server';

import { getLeaderboard } from '@/app/[locale]/(public)/leaderboard/_actions/getLeaderboard';
import { buildDetailPath } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { createPracticeResultMetadata } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './ResultClient';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'squareColors',
  canonicalPath: 'practice/square-colors/result',
});

export default async function SquareColorsResultPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const leaderboardResult = await getLeaderboard('square_colors', 'default', 'weekly', 1);
  const leaderboardRows = leaderboardResult.rows.slice(0, 3);
  const leaderboardDetailPath = buildDetailPath('weekly', 'square_colors', 'default');

  return (
    <Suspense>
      <ResultClient
        locale={locale}
        adBannerWide={<AdBannerGuard slot="banner-wide" />}
        adBannerStandard={<AdBannerGuard slot="banner-standard" />}
        leaderboardRows={leaderboardRows}
        leaderboardDetailPath={leaderboardDetailPath}
      />
    </Suspense>
  );
}
