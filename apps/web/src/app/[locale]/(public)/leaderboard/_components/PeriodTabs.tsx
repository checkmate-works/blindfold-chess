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
 * This is the ONLY period switcher — a discreet client `<select>` variant
 * (`PeriodSelector`) used to exist for the detail pages and was removed on
 * purpose, not for looks: on iOS the native picker's `change` event carries
 * no page-level user activation, so the `history.pushState` Next.js later
 * issues for the `router.push` is classed as a JS "dummy" entry by WebKit's
 * swipe-back hardening (WebKit bug 248303, iOS 16 regression), and the
 * swipe-back gesture then skips or silently ignores the entry. Real `<a>`
 * taps keep their activation. Do not resurrect a select-driven
 * `router.push` period switcher while that WebKit behaviour is in the
 * field.
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
              isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`period.${p}`)}
          </Link>
        );
      })}
    </div>
  );
}
