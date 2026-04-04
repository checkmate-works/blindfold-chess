'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardPeriod } from '../_lib/types';
import { VALID_PERIODS } from '../_lib/types';

type Props = {
  currentPeriod: LeaderboardPeriod;
};

export function PeriodSelector({ currentPeriod }: Props) {
  const t = useTranslations('leaderboard');
  const router = useRouter();
  const searchParams = useSearchParams();

  function handlePeriodChange(period: LeaderboardPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    router.push(`?${params.toString()}`);
  }

  return (
    <div
      className="flex rounded-lg bg-secondary p-1"
      role="radiogroup"
      aria-label={t('periodLabel')}
    >
      {VALID_PERIODS.map((p) => {
        const isActive = currentPeriod === p;
        return (
          <button
            key={p}
            role="radio"
            aria-checked={isActive}
            onClick={() => handlePeriodChange(p)}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`period.${p}`)}
          </button>
        );
      })}
    </div>
  );
}
