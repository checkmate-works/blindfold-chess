/**
 * Score Leaderboard (`/leaderboard/score/[period]`)
 *
 * @description
 * Canonical category-first score leaderboard. Displays weekly/monthly/all-time
 * score rankings for challenge-enabled practice modules. Users can filter by
 * module via the path segment `/leaderboard/score/[period]/[module-slug]`
 * (middle hub). The period is path-based. Shows top scores with leaderboard
 * cards linking to detailed per-module/per-key rankings.
 *
 * Top-3 ranks are displayed with medal emojis and highlighted rows (left border
 * accent + subtle background). The SCORE column shows miss count inline as
 * `score(misses)` with color-coded miss indicators.
 *
 * @flow
 * - Score/Exp category tabs
 * - Period tabs: weekly / monthly / all-time (path-based)
 * - Module filter: all / per-module filter (path-based)
 * - LeaderboardTopContent: Top-ranked entries with scores
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  ScoreLeaderboardSkeleton,
  ScoreLeaderboardView,
} from '../../_components/ScoreLeaderboardView';
import type { LeaderboardPeriod } from '../../_lib/types';
import { isValidPeriod } from '../../_lib/validators';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, period: periodParam } = await params;
  if (!isValidPeriod(periodParam)) return {};
  const t = await getTranslations({ locale, namespace: 'metadata.leaderboard' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `leaderboard/score/${periodParam}`,
      title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

/**
 * Deliberately NOT a segment-level `loading.tsx`. A `loading.tsx` file wraps
 * this segment's entire subtree in a `<Suspense>` boundary — including the
 * deeper `[module-slug]/[key]` detail route — so navigating straight to a
 * deep leaderboard entry (e.g. from the home feed's rank-update card, which
 * links directly to `/leaderboard/score/all-time/legal-moves/rook`) would
 * flash this page's card-grid skeleton before the detail page's own table
 * skeleton mounted. Scoping the boundary inside this page's own JSX means it
 * only exists in the render tree when this exact route is the matched leaf,
 * eliminating the double-skeleton flash while still showing a fallback for
 * direct navigation to this route.
 */
export default async function ScoreLeaderboardPeriodPage({ params }: Props) {
  const { locale, period: periodParam } = await params;
  if (!isValidPeriod(periodParam)) {
    notFound();
  }
  const period: LeaderboardPeriod = periodParam;
  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  return (
    <Suspense fallback={<ScoreLeaderboardSkeleton />}>
      <ScoreLeaderboardView
        locale={locale}
        period={period}
        moduleFilter="all"
        currentSlug="all"
        breadcrumbItems={[{ label: t('title') }]}
      />
    </Suspense>
  );
}
