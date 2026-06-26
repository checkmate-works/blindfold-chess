'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardRow } from '../_lib/types';
import { PlayerCell } from './PlayerCell';
import { ScoreCell } from './ScoreCell';

type Props = {
  row: LeaderboardRow;
  locale: string;
};

export function CurrentUserRankRow({ row, locale }: Props) {
  const t = useTranslations('leaderboard');

  return (
    <div className="border-t-2 border-border mt-2">
      <div className="bg-primary/10 dark:bg-primary/15 rounded-b-lg">
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
              <ScoreCell row={row} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
