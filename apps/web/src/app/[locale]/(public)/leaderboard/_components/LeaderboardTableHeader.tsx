'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

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
        <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
          {t('table.score')}
        </th>
      </tr>
    </thead>
  );
}
