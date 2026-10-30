import { permanentRedirect } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { parsePeriod } from './validators';

export type PeriodIndexRedirectProps = {
  params: Promise<{
    locale: Locale;
  }>;
  // Next.js delivers repeated query keys as string[], so accept both forms and
  // normalize below.
  searchParams: Promise<{
    period?: string | string[];
  }>;
};

/**
 * Permanently redirect a leaderboard index to its canonical
 * `/leaderboard/<category>/<period>` URL, absorbing any legacy `?period=`
 * query string (default `all-time`). Shared by the `/leaderboard`,
 * `/leaderboard/score` and `/leaderboard/exp` index pages.
 */
export async function redirectToPeriodIndex(
  category: 'score' | 'exp',
  { params, searchParams }: PeriodIndexRedirectProps
): Promise<never> {
  const { locale } = await params;
  const { period: periodParam } = await searchParams;
  const raw = Array.isArray(periodParam) ? periodParam[0] : periodParam;
  const period = parsePeriod(raw);
  permanentRedirect(`/${locale}/leaderboard/${category}/${period}`);
}
