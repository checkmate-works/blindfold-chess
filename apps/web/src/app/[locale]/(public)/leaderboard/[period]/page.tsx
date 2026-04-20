/**
 * Legacy score leaderboard shim (`/leaderboard/[period]` — 308 redirect)
 *
 * @description
 * Absorbs the pre-refactor period-first URL shape and redirects to the
 * canonical category-first form `/leaderboard/score/[period]`. If the legacy
 * `?module=` query param is present, it is absorbed into the middle-hub path
 * segment `/leaderboard/score/[period]/[module-slug]`.
 *
 * Invalid `period` values produce a real 404 (strict). The `'score'` and
 * `'exp'` reserved category segments are also 404'd here as defense-in-depth
 * against any future change in Next.js's static-vs-dynamic routing precedence
 * — today those literals hit the `score/` / `exp/` sibling directories instead
 * and never reach this shim.
 */
import { notFound, permanentRedirect } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { MODULE_TO_SLUG } from '../_lib/types';
import { isValidPeriod, parseModuleFilter } from '../_lib/validators';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
  }>;
  searchParams: Promise<{
    module?: string | string[];
  }>;
};

export default async function LegacyLeaderboardPeriodRedirect({ params, searchParams }: Props) {
  const { locale, period: periodParam } = await params;

  // Defense in depth: if Next's static>dynamic precedence ever flips, the
  // reserved category segments must still 404 here rather than be treated
  // as periods.
  if (periodParam === 'score' || periodParam === 'exp') {
    notFound();
  }

  if (!isValidPeriod(periodParam)) {
    notFound();
  }

  const { module: moduleParam } = await searchParams;
  const moduleFilter = parseModuleFilter(moduleParam);

  if (moduleFilter !== 'all') {
    const slug = MODULE_TO_SLUG[moduleFilter];
    permanentRedirect(`/${locale}/leaderboard/score/${periodParam}/${slug}`);
  }

  permanentRedirect(`/${locale}/leaderboard/score/${periodParam}`);
}
