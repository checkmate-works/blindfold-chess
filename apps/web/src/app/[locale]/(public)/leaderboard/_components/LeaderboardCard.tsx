'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

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

  return (
    <Link
      href={`/${locale}${detailPath}`}
      className="group block rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-foreground/20"
    >
      <h3 className="text-sm font-medium text-foreground mb-2">{title}</h3>
      {rank !== null ? (
        <p className="text-lg font-semibold text-primary tabular-nums">
          {t('rankLabel', { rank })}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t('notRanked')}</p>
      )}
    </Link>
  );
}
