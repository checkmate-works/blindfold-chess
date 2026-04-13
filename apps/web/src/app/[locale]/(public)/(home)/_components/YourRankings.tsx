import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getOptionalUser } from '@/lib/auth';

import { getUserRanks } from '@/app/[locale]/(public)/leaderboard/_actions/getUserRanks';
import { LeaderboardCard } from '@/app/[locale]/(public)/leaderboard/_components/LeaderboardCard';
import type { LeaderboardEntry } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { PagePanel, SectionTitle } from '@/app/[locale]/_components';

const MAX_DISPLAY = 3;

const REPRESENTATIVE_ENTRIES: LeaderboardEntry[] = [
  { module: 'coordinate_quiz', key: 'white' },
  { module: 'legal_moves', key: 'random' },
  { module: 'square_colors', key: 'default' },
];

type Props = {
  locale: string;
};

export async function YourRankings({ locale }: Props) {
  const user = await getOptionalUser();

  const ranks = user ? await getUserRanks(user.id, 'weekly') : [];
  const topRanks = ranks
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_DISPLAY);

  const t = await getTranslations({ locale, namespace: 'home.yourRankings' });

  return (
    <PagePanel className="space-y-4">
      <SectionTitle>{t('title')}</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topRanks.length > 0
          ? topRanks.map((rank) => (
              <LeaderboardCard
                key={`${rank.module}:${rank.key}`}
                locale={locale}
                module={rank.module}
                settingKey={rank.key}
                period="weekly"
                rank={rank.rank}
              />
            ))
          : REPRESENTATIVE_ENTRIES.map((entry) => (
              <LeaderboardCard
                key={`${entry.module}:${entry.key}`}
                locale={locale}
                module={entry.module}
                settingKey={entry.key}
                period="weekly"
                rank={null}
              />
            ))}
      </div>
      <div className="text-center">
        <Link
          href="/leaderboard/score/weekly"
          locale={locale}
          className="text-sm text-link-primary hover:text-link-primary/80 transition-colors"
        >
          {t('viewAll')}
        </Link>
      </div>
    </PagePanel>
  );
}
