import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';

import type { LeaderboardModuleSlug, LeaderboardPeriod, ModuleFilterValue } from '../_lib/types';
import { MODULE_TO_SLUG, VALID_MODULE_FILTERS } from '../_lib/types';

type CurrentSlug = LeaderboardModuleSlug | 'all';

type Props = {
  currentSlug: CurrentSlug;
  period: LeaderboardPeriod;
  locale: string;
};

/**
 * Module filter rendered as a segmented-control link bar. Drives navigation
 * via path segments (`/leaderboard/score/[period]/[module-slug]`) instead of
 * the legacy `?module=` query param, so each filter state has a stable
 * canonical URL.
 *
 * This is an async server component so it can await `getTranslations`
 * directly and render `<Link>` elements for SSR-friendly navigation without
 * any client JS. Import directly from `./ModuleFilter` (not via the
 * `_components` barrel) to avoid pulling server-only deps into client bundles.
 */
export async function ModuleFilter({ currentSlug, period, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  function buildHref(value: ModuleFilterValue): string {
    if (value === 'all') {
      return `/${locale}/leaderboard/score/${period}`;
    }
    const slug = MODULE_TO_SLUG[value];
    return `/${locale}/leaderboard/score/${period}/${slug}`;
  }

  function isActive(value: ModuleFilterValue): boolean {
    if (value === 'all') return currentSlug === 'all';
    return MODULE_TO_SLUG[value] === currentSlug;
  }

  return (
    <div
      className="flex rounded-lg bg-secondary p-1"
      role="radiogroup"
      aria-label={t('moduleFilterLabel')}
    >
      {VALID_MODULE_FILTERS.map((m) => {
        const active = isActive(m);
        const emoji = m === 'all' ? null : PRACTICE_EMOJIS[m];
        return (
          <Link
            key={m}
            href={buildHref(m)}
            role="radio"
            aria-checked={active}
            title={t(`moduleFilter.${m}`)}
            className={`flex-1 rounded-md px-2 py-2 text-center text-sm font-medium leading-tight transition-colors md:flex md:flex-col md:items-center md:justify-center md:gap-0.5 md:px-4 ${
              active ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {emoji ? (
              // Stack emoji over label on md+: the emoji sits on its own line
              // and the label wraps beneath it, giving every tab a uniform
              // two-row shape. Mobile shows the emoji only (label hidden).
              <>
                <span>{emoji}</span>
                <span className="hidden md:block">{t(`moduleFilter.${m}`)}</span>
              </>
            ) : (
              t(`moduleFilter.${m}`)
            )}
          </Link>
        );
      })}
    </div>
  );
}
