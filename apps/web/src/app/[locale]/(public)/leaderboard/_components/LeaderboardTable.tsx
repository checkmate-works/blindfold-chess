'use client';

import { useTranslations } from 'next-intl';

import type { LeaderboardRow } from '../_lib/types';
import { CurrentUserRankRow } from './CurrentUserRankRow';
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
          <thead>
            <tr className="border-b-2 border-border">
              <th className="py-3 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">
                {t('table.rank')}
              </th>
              <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('table.player')}
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">
                {t('table.score')}
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                {t('table.miss')}
              </th>
            </tr>
          </thead>
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
