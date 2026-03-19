'use client';

import { useTranslations } from 'next-intl';

import type { LeaderboardRow } from '../_lib/types';
import { formatTime } from '../_lib/utils';
import { LeaderboardTableRow } from './LeaderboardTableRow';
import { PlayerCell } from './PlayerCell';
import { RankBadge } from './RankBadge';

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
      <div className="overflow-x-auto">
        <table className="w-full" aria-label={t('title')}>
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
                {t('table.incorrect')}
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">
                {t('table.time')}
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

      {/* Current user rank footer */}
      {currentUserRank && (
        <div className="border-t-2 border-border mt-2">
          <div className="bg-primary/5 dark:bg-primary/10 rounded-b-lg">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-3 px-3 text-center w-16">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {t('yourRank')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center w-16">
                    <RankBadge rank={currentUserRank.rank} />
                  </td>
                  <td className="py-3 px-3">
                    <PlayerCell row={currentUserRank} locale={locale} />
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground w-20">
                    {currentUserRank.score}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-muted-foreground w-24">
                    {currentUserRank.incorrectAnswers}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-muted-foreground w-20">
                    {formatTime(currentUserRank.timeTaken)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
