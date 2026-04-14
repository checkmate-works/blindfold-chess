import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import type { LeaderboardPeriod } from '../_lib/types';
import { VALID_PERIODS } from '../_lib/types';

type Props = {
  currentPeriod: LeaderboardPeriod;
  hrefs: Record<LeaderboardPeriod, string>;
  locale: string;
};

/**
 * Period switcher rendered as a segmented-control tab list (the original
 * pre-refactor look). Uses `<Link>` elements so navigation works without JS
 * and the page stays SSR-friendly. This is an async server component so it
 * can await `getTranslations` directly.
 *
 * Use this variant on pages where the period switch is a primary navigation
 * affordance (e.g., the score top page). For secondary pages where the
 * switch is a discreet utility control, use the client `<PeriodSelector>`
 * dropdown instead.
 */
export async function PeriodTabs({ currentPeriod, hrefs, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  return (
    <div
      className="flex rounded-lg bg-secondary p-1"
      role="radiogroup"
      aria-label={t('periodLabel')}
    >
      {VALID_PERIODS.map((p) => {
        const isActive = currentPeriod === p;
        return (
          <Link
            key={p}
            href={hrefs[p]}
            role="radio"
            aria-checked={isActive}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`period.${p}`)}
          </Link>
        );
      })}
    </div>
  );
}
