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

import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LeaderboardTabs } from '../_components/LeaderboardTabs';
import { getExpLeaderboard } from './_actions/getExpLeaderboard';
import { ExpLeaderboardTable } from './_components/ExpLeaderboardTable';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

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

export default async function ExpLeaderboardPage({ params }: Props) {
  const { locale } = await params;
  const { rows } = await getExpLeaderboard();

  return (
    <PagePanel>
      <LeaderboardTabs activeTab="exp" />

      <ExpLeaderboardTable rows={rows} locale={locale} />
    </PagePanel>
  );
}
