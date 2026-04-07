/**
 * Leaderboard (リーダーボード — `/leaderboard`)
 *
 * @description
 * Displays weekly/monthly/all-time score rankings for challenge-enabled practice
 * modules. Users can filter by module and period. Shows top scores with
 * leaderboard cards linking to detailed per-module/per-key rankings.
 *
 * Top-3 ranks are displayed with medal emojis and highlighted rows (left border
 * accent + subtle background). The SCORE column shows miss count inline as
 * `score(misses)` with color-coded miss indicators.
 *
 * @flow
 * - Period selector: weekly / monthly / all-time
 * - Module filter: all / per-module filter
 * - LeaderboardTopContent: Top-ranked entries with scores
 */
import { Suspense } from 'react';

import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, Skeleton } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ModuleFilter, PeriodSelector } from './_components';
import { LeaderboardTabs } from './_components/LeaderboardTabs';
import { LeaderboardTopContent } from './_components/LeaderboardTopContent';
import { SignUpBanner } from './_components/SignUpBanner';
import type { LeaderboardPeriod, ModuleFilterValue } from './_lib/types';
import { isValidModuleFilter, isValidPeriod } from './_lib/validators';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    period?: string;
    module?: string;
  }>;
};

function parsePeriod(value: string | undefined): LeaderboardPeriod {
  if (value && isValidPeriod(value)) {
    return value;
  }
  return 'all-time';
}

function parseModuleFilter(value: string | undefined): ModuleFilterValue {
  if (value && isValidModuleFilter(value)) {
    return value;
  }
  return 'all';
}

export default async function LeaderboardIndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { period: periodParam, module: moduleParam } = await searchParams;
  const period = parsePeriod(periodParam);
  const moduleFilter = parseModuleFilter(moduleParam);
  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  return (
    <PagePanel>
      <Suspense fallback={null}>
        <SignUpBanner locale={locale} />
      </Suspense>

      <LeaderboardTabs activeTab="score" />

      <PeriodSelector currentPeriod={period} />
      <ModuleFilter currentModule={moduleFilter} />

      <Suspense
        key={`${period}:${moduleFilter}`}
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        }
      >
        <LeaderboardTopContent
          locale={locale}
          period={period}
          moduleFilter={moduleFilter}
          allLeaderboardsTitle={t('allLeaderboardsSection')}
        />
      </Suspense>

      <AdBannerGuard slot="banner-standard" />

      <Divider />

      <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
    </PagePanel>
  );
}
