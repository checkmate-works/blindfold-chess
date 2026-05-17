'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardRow } from '../_lib/types';
import { CurrentUserRankRow } from './CurrentUserRankRow';
import { LeaderboardTableHeader } from './LeaderboardTableHeader';
import { LeaderboardTableRow } from './LeaderboardTableRow';
import { LeaderboardEmptyState, LeaderboardTableShell } from './LeaderboardTableShell';

type Props = {
  rows: LeaderboardRow[];
  currentUserId: string | null;
  currentUserRank: LeaderboardRow | null;
  locale: string;
};

export function LeaderboardTable({ rows, currentUserId, currentUserRank, locale }: Props) {
  const t = useTranslations('leaderboard');

  if (rows.length === 0) {
    return <LeaderboardEmptyState message={t('emptyState')} />;
  }

  return (
    <LeaderboardTableShell
      ariaLabel={t('title')}
      footer={currentUserRank && <CurrentUserRankRow row={currentUserRank} locale={locale} />}
    >
      <LeaderboardTableHeader />
      <tbody className="divide-y divide-border">
        {rows.map((row) => (
          <LeaderboardTableRow
            key={row.userId}
            row={row}
            isCurrentUser={row.userId === currentUserId}
            locale={locale}
          />
        ))}
      </tbody>
    </LeaderboardTableShell>
  );
}
