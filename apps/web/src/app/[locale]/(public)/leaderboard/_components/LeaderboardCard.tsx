'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { IconTileCard } from '@/app/[locale]/_components/IconTileCard';

import { getLeaderboardIcon } from '../_lib/icons';
import type { LeaderboardModule, LeaderboardPeriod } from '../_lib/types';
import { buildDetailPath } from '../_lib/types';

type Props = {
  locale: string;
  module: LeaderboardModule;
  settingKey: string;
  period: LeaderboardPeriod;
  rank: number | null;
};

export function LeaderboardCard({ locale, module, settingKey, period, rank }: Props) {
  const t = useTranslations('leaderboard');

  const title = t(`cardTitle.${module}.${settingKey}`);
  const detailPath = buildDetailPath(period, module, settingKey);
  const icon = getLeaderboardIcon(module, settingKey);

  return (
    <IconTileCard
      href={`/${locale}${detailPath}`}
      icon={icon}
      title={title}
      subtitle={
        rank !== null ? (
          <p className="text-lg font-semibold text-primary tabular-nums">
            {t('rankLabel', { rank })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('notRanked')}</p>
        )
      }
    />
  );
}
