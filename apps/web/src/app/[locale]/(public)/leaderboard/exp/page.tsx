/**
 * Exp Leaderboard index redirect (`/leaderboard/exp` → `/leaderboard/exp/[period]`)
 *
 * @description
 * Absorbs any legacy `?period=` query string and permanently redirects to the
 * canonical category-first exp leaderboard URL. Uses `permanentRedirect`
 * (308) so crawlers consolidate link equity onto the new URL. Default period
 * is `all-time`.
 *
 * Static routing precedence: this file sits at a static segment (`exp`),
 * so Next.js dispatches `/leaderboard/exp` here rather than to the legacy
 * `[period]/page.tsx` shim with `period="exp"` — which is why the legacy
 * shim additionally 404s when it sees `period === 'score'` or `period === 'exp'`
 * (defense in depth in case precedence ever flips).
 */
import { permanentRedirect } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { parsePeriod } from '../_lib/validators';

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

export default async function ExpLeaderboardIndexRedirect({ params, searchParams }: Props) {
  const { locale } = await params;
  const { period: periodParam } = await searchParams;
  const raw = Array.isArray(periodParam) ? periodParam[0] : periodParam;
  const period = parsePeriod(raw);
  permanentRedirect(`/${locale}/leaderboard/exp/${period}`);
}
