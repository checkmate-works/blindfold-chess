import { Suspense } from 'react';

import { setRequestLocale } from 'next-intl/server';

import { getLeaderboard } from '@/app/[locale]/(public)/leaderboard/_actions/getLeaderboard';
import { buildDetailPath } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { createPracticeResultMetadata } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './ResultClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'legalMoves',
  canonicalPath: 'practice/legal-moves/result',
});

export default async function LegalMovesResultPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const sp = await props.searchParams;
  const piece = typeof sp.piece === 'string' ? sp.piece : 'random';

  const leaderboardResult = await getLeaderboard('legal_moves', piece, 'weekly', 1);
  const leaderboardRows = leaderboardResult.rows.slice(0, 3);
  const leaderboardDetailPath = buildDetailPath('weekly', 'legal_moves', piece);

  return (
    <Suspense>
      <ResultClient
        locale={locale}
        adBannerStandard={<AdBannerGuard slot="banner-standard" />}
        leaderboardRows={leaderboardRows}
        leaderboardDetailPath={leaderboardDetailPath}
      />
    </Suspense>
  );
}
