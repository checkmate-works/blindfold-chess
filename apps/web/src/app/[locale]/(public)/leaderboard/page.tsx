import { Suspense } from 'react';

import { getTranslations } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { Divider, PagePanel, Skeleton } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LeaderboardTopContent } from './_components/LeaderboardTopContent';
import { PeriodSelector } from './_components/PeriodSelector';
import type { LeaderboardPeriod } from './_lib/types';
import { isValidPeriod } from './_lib/validators';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    period?: string;
  }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

function parsePeriod(value: string | undefined): LeaderboardPeriod {
  if (value && isValidPeriod(value)) {
    return value;
  }
  return 'all-time';
}

export default async function LeaderboardIndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);
  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  return (
    <PagePanel>
      <PeriodSelector currentPeriod={period} />

      <Suspense
        key={period}
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
          yourRankedTitle={t('yourRankedSection')}
          allLeaderboardsTitle={t('allLeaderboardsSection')}
        />
      </Suspense>

      <Divider />

      <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
    </PagePanel>
  );
}
