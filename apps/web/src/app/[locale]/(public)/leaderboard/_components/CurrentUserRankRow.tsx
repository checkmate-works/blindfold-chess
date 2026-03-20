'use client';

import { useTranslations } from 'next-intl';

import type { LeaderboardRow } from '../_lib/types';
import { LeaderboardRowCells } from './LeaderboardRowCells';

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
              <LeaderboardRowCells row={row} locale={locale} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
