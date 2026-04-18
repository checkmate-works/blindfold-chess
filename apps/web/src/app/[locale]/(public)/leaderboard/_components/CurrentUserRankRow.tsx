'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { getMissColorClass } from '@/lib/challenge/ui';

import type { LeaderboardRow } from '../_lib/types';
import { PlayerCell } from './PlayerCell';

type Props = {
  row: LeaderboardRow;
  locale: string;
};

export function CurrentUserRankRow({ row, locale }: Props) {
  const t = useTranslations('leaderboard');

  return (
    <div className="border-t-2 border-border mt-2">
      <div className="bg-primary/5 dark:bg-primary/10 rounded-b-lg">
        <table className="w-full table-fixed">
          <tbody>
            <tr>
              <td className="py-3 px-3 text-center w-16">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {t('yourRank')}
                </span>
              </td>
              <td className="py-3 px-3">
                <PlayerCell row={row} locale={locale} />
              </td>
              <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground w-24">
                {row.score}
                <span
                  className={`text-xs ml-0.5 font-normal ${getMissColorClass(row.incorrectAnswers)}`}
                >
                  ({row.incorrectAnswers})
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
