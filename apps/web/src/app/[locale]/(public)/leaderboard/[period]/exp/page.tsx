/**
 * Legacy exp leaderboard shim (`/leaderboard/[period]/exp` — 308 redirect)
 *
 * @description
 * Absorbs the pre-refactor period-first URL shape and redirects to the
 * canonical category-first form `/leaderboard/exp/[period]`. Invalid `period`
 * values produce a real 404 (strict).
 *
 * If a `?period=X` query string is also present (from even-older legacy
 * links), the PATH period wins and the query is dropped — this guarantees a
 * single-hop redirect with no chain.
 */
import { notFound, permanentRedirect } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { isValidPeriod } from '../../_lib/validators';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
  }>;
};

export default async function LegacyExpLeaderboardRedirect({ params }: Props) {
  const { locale, period: periodParam } = await params;

  if (!isValidPeriod(periodParam)) {
    notFound();
  }

  permanentRedirect(`/${locale}/leaderboard/exp/${periodParam}`);
}
