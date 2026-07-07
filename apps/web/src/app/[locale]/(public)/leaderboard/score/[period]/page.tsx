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

import { getOptionalUser } from '@/lib/auth';

import { Divider, PagePanel, Skeleton } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LeaderboardTabs } from '../../_components/LeaderboardTabs';
import { LeaderboardTopContent } from '../../_components/LeaderboardTopContent';
import { ModuleFilter } from '../../_components/ModuleFilter';
import { PeriodTabs } from '../../_components/PeriodTabs';
import { SignUpBanner } from '../../_components/SignUpBanner';
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

async function ScoreLeaderboardPeriodContent({ params }: Props) {
  const { locale, period: periodParam } = await params;
  if (!isValidPeriod(periodParam)) {
    notFound();
  }
  const period: LeaderboardPeriod = periodParam;
  const t = await getTranslations({ locale, namespace: 'leaderboard' });
  // `getOptionalUser` is React-`cache()`d in @/lib/auth, so this call dedups
  // with the one the parent `layout.tsx` already made — no double round-trip.
  const user = await getOptionalUser();

  return (
    <PagePanel>
      <SectionTitle>{t('scoreLeaderboardSection')}</SectionTitle>

      {!user && <SignUpBanner locale={locale} />}

      <LeaderboardTabs activeTab="score" locale={locale} period={period} />

      <PeriodTabs
        currentPeriod={period}
        locale={locale}
        hrefs={{
          'all-time': `/${locale}/leaderboard/score/all-time`,
          weekly: `/${locale}/leaderboard/score/weekly`,
          monthly: `/${locale}/leaderboard/score/monthly`,
        }}
      />

      <ModuleFilter currentSlug="all" period={period} locale={locale} />

      <Suspense
        key={`${period}:all`}
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <LeaderboardTopContent locale={locale} period={period} moduleFilter="all" />
      </Suspense>

      <AdSlot slot="content-bottom" />

      {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. */}
      <div className="!mt-4 space-y-4">
        <Divider />
        <Breadcrumb items={[{ label: t('title') }]} locale={locale} density="compact" />
      </div>
    </PagePanel>
  );
}

/**
 * Mirrors `ScoreLeaderboardPeriodContent`'s resolved DOM topology exactly
 * (SectionTitle → SignUpBanner placeholder → Score/Exp tabs → Period tabs →
 * Module filter → card grid) so there is no layout shift when the real
 * content resolves. See the `<Suspense>` below for why this lives inline
 * instead of in a segment-level `loading.tsx`.
 */
function ScoreLeaderboardPeriodSkeleton() {
  return (
    <PagePanel>
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />

      {/*
        SignUpBanner fallback — fixed height matching SignUpBannerUI's
        resolved box. Auto-hidden for authenticated users via the layout's
        scoped inline style rule (`leaderboard/layout.tsx`).
      */}
      <div
        data-banner-placeholder
        className="h-24 rounded-lg border border-primary/30 bg-primary/5 sm:h-20"
      />

      {/* LeaderboardTabs (2 buttons) */}
      <div className="flex rounded-lg bg-secondary p-1">
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
      </div>

      {/* PeriodTabs (3 buttons) */}
      <div className="flex rounded-lg bg-secondary p-1">
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
      </div>

      {/* ModuleFilter (7 buttons: all + 6 modules) */}
      <div className="flex rounded-lg bg-secondary p-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-10 flex-1 rounded-md" />
        ))}
      </div>

      {/* Card grid (6 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </PagePanel>
  );
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
export default function ScoreLeaderboardPeriodPage({ params }: Props) {
  return (
    <Suspense fallback={<ScoreLeaderboardPeriodSkeleton />}>
      <ScoreLeaderboardPeriodContent params={params} />
    </Suspense>
  );
}
