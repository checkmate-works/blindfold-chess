/**
 * Score Leaderboard index redirect (`/leaderboard/score` → `/leaderboard/score/[period]`)
 *
 * @description
 * Absorbs any legacy `?period=` query string and permanently redirects to the
 * canonical category-first score leaderboard URL. Uses `permanentRedirect`
 * (308) so crawlers consolidate link equity onto the new URL. Default period
 * is `all-time`.
 *
 * Static routing precedence: this file sits at a static segment (`score`),
 * so Next.js dispatches `/leaderboard/score` here rather than to the legacy
 * `[period]/page.tsx` shim with `period="score"` — which is why the legacy
 * shim additionally 404s when it sees `period === 'score'` or `period === 'exp'`
 * (defense in depth in case precedence ever flips).
 */
import { permanentRedirect } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { parsePeriod } from '../_lib/validators';

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

export default async function ScoreLeaderboardIndexRedirect({ params, searchParams }: Props) {
  const { locale } = await params;
  const { period: periodParam } = await searchParams;
  const raw = Array.isArray(periodParam) ? periodParam[0] : periodParam;
  const period = parsePeriod(raw);
  permanentRedirect(`/${locale}/leaderboard/score/${period}`);
}
