import { Suspense } from 'react';

import { getTranslations } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';

import { Divider, PagePanel, Skeleton } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { LeaderboardPeriod, ModuleFilterValue } from '../_lib/types';
import { LeaderboardTabs } from './LeaderboardTabs';
import { LeaderboardTopContent } from './LeaderboardTopContent';
import { type CurrentSlug, ModuleFilter } from './ModuleFilter';
import { PeriodTabs } from './PeriodTabs';
import { SignUpBanner } from './SignUpBanner';

/**
 * The score leaderboard page body, shared by `/leaderboard/score/[period]` and
 * its per-module hub `/leaderboard/score/[period]/[module-slug]`.
 *
 * The two routes rendered the identical component stack — section title, sign-up
 * banner, category tabs, period tabs, module filter, suspended card grid, ad
 * slot, breadcrumb — and differed only in the five values below. The copy had
 * also dropped every explanatory comment from the original along the way.
 */
type Props = {
  locale: Locale;
  period: LeaderboardPeriod;
  /** Which module's cards to show; `'all'` on the unfiltered page. */
  moduleFilter: ModuleFilterValue;
  /** Slug the module filter highlights — `'all'` or the current module's. */
  currentSlug: CurrentSlug;
  /** Appended to each period tab's href; the module hub keeps its module. */
  periodHrefSuffix?: string;
  breadcrumbItems: BreadcrumbItem[];
};

export async function ScoreLeaderboardView({
  locale,
  period,
  moduleFilter,
  currentSlug,
  periodHrefSuffix = '',
  breadcrumbItems,
}: Props) {
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
          'all-time': `/${locale}/leaderboard/score/all-time${periodHrefSuffix}`,
          weekly: `/${locale}/leaderboard/score/weekly${periodHrefSuffix}`,
          monthly: `/${locale}/leaderboard/score/monthly${periodHrefSuffix}`,
        }}
      />

      <ModuleFilter currentSlug={currentSlug} period={period} locale={locale} />

      <Suspense
        key={`${period}:${moduleFilter}`}
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <LeaderboardTopContent locale={locale} period={period} moduleFilter={moduleFilter} />
      </Suspense>

      <AdSlot slot="content-bottom" />

      {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. */}
      <div className="!mt-4 space-y-4">
        <Divider />
        <Breadcrumb items={breadcrumbItems} locale={locale} density="compact" />
      </div>
    </PagePanel>
  );
}

/**
 * Mirrors {@link ScoreLeaderboardView}'s resolved DOM topology exactly
 * (SectionTitle → SignUpBanner placeholder → Score/Exp tabs → Period tabs →
 * Module filter → card grid) so there is no layout shift when the real content
 * resolves. Only the card grid's entry count varies between the two routes at
 * render time, not the topology, so one skeleton serves both.
 *
 * Both pages keep this inline in their own JSX rather than as a segment-level
 * `loading.tsx` — see the comment on the page components for why.
 */
export function ScoreLeaderboardSkeleton() {
  return (
    <PagePanel>
      <Skeleton className="h-8 w-56 rounded" />

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
