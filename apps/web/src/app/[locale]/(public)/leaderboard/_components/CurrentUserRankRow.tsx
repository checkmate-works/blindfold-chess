'use client';

import { useTranslations } from 'next-intl';

import type { LeaderboardRow } from '../_lib/types';
import { formatTime } from '../_lib/utils';
import { PlayerCell } from './PlayerCell';
import { RankBadge } from './RankBadge';

type Props = {
  row: LeaderboardRow;
  locale: string;
};

export function CurrentUserRankRow({ row, locale }: Props) {
  const t = useTranslations('leaderboard');

  return (
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
                <RankBadge rank={row.rank} />
              </td>
              <td className="py-3 px-3">
                <PlayerCell row={row} locale={locale} />
              </td>
              <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground w-20">
                {row.score}
              </td>
              <td className="py-3 px-3 text-right tabular-nums text-muted-foreground w-24">
                {row.incorrectAnswers}
              </td>
              <td className="py-3 px-3 text-right tabular-nums text-muted-foreground w-20">
                {formatTime(row.timeTaken)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
