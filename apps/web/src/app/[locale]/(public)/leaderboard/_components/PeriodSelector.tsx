'use client';

import { useId } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardPeriod } from '../_lib/types';

type Props = {
  currentPeriod: LeaderboardPeriod;
  // Precomputed hrefs as a plain data prop. A function prop would fail RSC
  // serialization at the server→client boundary ("Functions cannot be passed
  // directly to Client Components"), so host Server Components must build the
  // three strings themselves.
  hrefs: Record<LeaderboardPeriod, string>;
};

// Canonical display order: shorter windows first so "weekly" is the default
// entry point and "all-time" is the deepest drill-down.
const PERIOD_OPTIONS = [
  'weekly',
  'monthly',
  'all-time',
] as const satisfies readonly LeaderboardPeriod[];

/**
 * Period switcher rendered as a native `<select>` dropdown. Kept as a discreet
 * utility control at the top of the leaderboard page so it does not compete
 * with the primary "Try this challenge" CTA further down the page.
 */
export function PeriodSelector({ currentPeriod, hrefs }: Props) {
  const t = useTranslations('leaderboard');
  const router = useRouter();
  const selectId = useId();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextPeriod = event.target.value as LeaderboardPeriod;
    router.push(hrefs[nextPeriod]);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-sm font-medium text-muted-foreground">
        {t('periodLabel')}
      </label>
      <select
        id={selectId}
        value={currentPeriod}
        onChange={handleChange}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {PERIOD_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {t(`period.${p}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
