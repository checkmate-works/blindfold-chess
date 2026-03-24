'use client';

import { useTranslations } from 'next-intl';

export function LeaderboardTableHeader() {
  const t = useTranslations('leaderboard');

  return (
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
  );
}
