'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PlayerCell, RankBadge } from '../../_components';
import {
  LeaderboardEmptyState,
  LeaderboardTableShell,
} from '../../_components/LeaderboardTableShell';
import { leaderboardRowClassName } from '../../_lib/leaderboard-row-style';
import type { ExpLeaderboardRow } from '../_actions/getExpLeaderboard';

type Props = {
  rows: ExpLeaderboardRow[];
  locale: string;
};

export function ExpLeaderboardTable({ rows, locale }: Props) {
  const t = useTranslations('expLeaderboard');

  if (rows.length === 0) {
    return <LeaderboardEmptyState message={t('emptyState')} />;
  }

  return (
    <LeaderboardTableShell ariaLabel={t('title')}>
      <thead>
        <tr className="border-b-2 border-border">
          <th className="py-3 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">
            {t('table.rank')}
          </th>
          <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('table.player')}
          </th>
          <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20 sm:w-24">
            {t('table.exp')}
          </th>
          <th className="hidden sm:table-cell py-3 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">
            {t('table.level')}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((row) => (
          <tr key={row.userId} className={leaderboardRowClassName({ rank: row.rank })}>
            <td className="py-3 px-3 text-center w-16">
              <RankBadge rank={row.rank} />
            </td>
            <td className="py-3 px-3">
              <PlayerCell row={row} locale={locale} />
            </td>
            <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground w-20 sm:w-24">
              {row.totalExp.toLocaleString()}
            </td>
            <td className="hidden sm:table-cell py-3 px-3 text-center tabular-nums text-muted-foreground w-20">
              {row.level}
            </td>
          </tr>
        ))}
      </tbody>
    </LeaderboardTableShell>
  );
}
