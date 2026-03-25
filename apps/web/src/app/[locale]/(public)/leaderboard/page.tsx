import { Suspense } from 'react';

import { getTranslations } from 'next-intl/server';

import { shouldShowAds } from '@/lib/ad';

import { Divider, PagePanel, Skeleton } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ModuleFilter, PeriodSelector } from './_components';
import { LeaderboardTopContent } from './_components/LeaderboardTopContent';
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
  const showAds = await shouldShowAds();

  return (
    <PagePanel>
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

      {showAds && <AdBanner slot="banner-standard" locale={locale} />}

      <Divider />

      <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
    </PagePanel>
  );
}
