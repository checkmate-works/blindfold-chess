'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PlayerCell, RankBadge } from '../../_components';
import type { ExpLeaderboardRow } from '../_actions/getExpLeaderboard';

type Props = {
  rows: ExpLeaderboardRow[];
  locale: string;
};

const TOP3_BORDER: Record<number, string> = {
  1: 'border-l-4 border-l-podium-gold',
  2: 'border-l-4 border-l-podium-silver',
  3: 'border-l-4 border-l-podium-bronze',
};

export function ExpLeaderboardTable({ rows, locale }: Props) {
  const t = useTranslations('expLeaderboard');

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">{t('emptyState')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full table-fixed" aria-label={t('title')}>
          <thead>
            <tr className="border-b-2 border-border">
              <th className="py-3 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">
                {t('table.rank')}
              </th>
              <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('table.player')}
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                {t('table.exp')}
              </th>
              <th className="py-3 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">
                {t('table.level')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const topBorder = TOP3_BORDER[row.rank] ?? '';
              const isTop3 = row.rank >= 1 && row.rank <= 3;
              const level = row.level;

              return (
                <tr
                  key={row.userId}
                  className={[
                    'border-b border-border last:border-b-0 transition-colors',
                    isTop3 ? 'bg-muted/30 dark:bg-muted/20 hover:bg-muted/50' : 'hover:bg-muted/50',
                    topBorder,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td className="py-3 px-3 text-center w-16">
                    <RankBadge rank={row.rank} />
                  </td>
                  <td className="py-3 px-3">
                    <PlayerCell row={row} locale={locale} />
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground w-24">
                    {row.totalExp.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-muted-foreground w-20">
                    {level}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
