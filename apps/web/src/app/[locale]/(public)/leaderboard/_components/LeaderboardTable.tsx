'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardRow } from '../_lib/types';
import { CurrentUserRankRow } from './CurrentUserRankRow';
import { LeaderboardTableHeader } from './LeaderboardTableHeader';
import { LeaderboardTableRow } from './LeaderboardTableRow';

type Props = {
  rows: LeaderboardRow[];
  currentUserId: string | null;
  currentUserRank: LeaderboardRow | null;
  locale: string;
};

export function LeaderboardTable({ rows, currentUserId, currentUserRank, locale }: Props) {
  const t = useTranslations('leaderboard');

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">{t('emptyState')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div>
        <table className="w-full table-fixed" aria-label={t('title')}>
          <LeaderboardTableHeader />
          <tbody>
            {rows.map((row) => (
              <LeaderboardTableRow
                key={row.userId}
                row={row}
                isCurrentUser={row.userId === currentUserId}
                locale={locale}
              />
            ))}
          </tbody>
        </table>
      </div>

      {currentUserRank && <CurrentUserRankRow row={currentUserRank} locale={locale} />}
    </div>
  );
}
