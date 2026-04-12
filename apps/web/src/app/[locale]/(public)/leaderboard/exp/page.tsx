/**
 * Exp Leaderboard (Exp ランキング — `/leaderboard/exp`)
 *
 * @description
 * Displays cumulative Exp rankings sourced from the `user_exp` table.
 * Shows top 50 users ranked by total experience points, with level
 * derived dynamically via `getLevel(totalExp)`.
 *
 * @flow
 * - Tab navigation: Score / Exp (shared with main leaderboard)
 * - ExpLeaderboardTable: Ranked rows with avatar, username, total Exp, level
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LeaderboardTabs } from '../_components/LeaderboardTabs';
import { PeriodSelector } from '../_components/PeriodSelector';
import type { LeaderboardPeriod } from '../_lib/types';
import { isValidPeriod } from '../_lib/validators';
import { getExpLeaderboard } from './_actions/getExpLeaderboard';
import { ExpLeaderboardTable } from './_components/ExpLeaderboardTable';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    period?: string;
  }>;
};

function parsePeriod(value: string | undefined): LeaderboardPeriod {
  if (value && isValidPeriod(value)) {
    return value;
  }
  return 'all-time';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.expLeaderboard' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'leaderboard/exp', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function ExpLeaderboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);
  const { rows } = await getExpLeaderboard(period);

  return (
    <PagePanel>
      <LeaderboardTabs activeTab="exp" locale={locale} />

      <PeriodSelector currentPeriod={period} />

      <ExpLeaderboardTable rows={rows} locale={locale} />

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PagePanel>
  );
}
