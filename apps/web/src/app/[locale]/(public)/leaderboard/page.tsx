/**
 * Leaderboard index redirect (`/leaderboard` → `/leaderboard/score/[period]`)
 *
 * @description
 * Absorbs any legacy `?period=` query string and permanently redirects to the
 * canonical category-first leaderboard URL. Uses `permanentRedirect` (308) so
 * crawlers consolidate link equity onto the new URL. Default period is
 * `all-time`.
 */
import { permanentRedirect } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { parsePeriod } from './_lib/validators';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  // Next.js delivers repeated query keys as string[], so accept both forms and
  // normalize below.
  searchParams: Promise<{
    period?: string | string[];
  }>;
};

export default async function LeaderboardIndexRedirect({ params, searchParams }: Props) {
  const { locale } = await params;
  const { period: periodParam } = await searchParams;
  const raw = Array.isArray(periodParam) ? periodParam[0] : periodParam;
  const period = parsePeriod(raw);
  permanentRedirect(`/${locale}/leaderboard/score/${period}`);
}
