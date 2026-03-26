import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getLeaderboard } from '@/app/[locale]/(public)/leaderboard/_actions/getLeaderboard';
import { buildDetailPath } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './ResultClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/legal-moves/result' }),
    title: `${t('legalMoves.title')} - ${t('result')}`,
  };
}

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
