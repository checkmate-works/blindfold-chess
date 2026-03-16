import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsString } from 'nuqs/server';

import { DailyTrendChart } from './_components/DailyTrendChart';
import { DateRangePicker } from './_components/DateRangePicker';
import { daysAgo, today } from './_lib/date-utils';
import { getNewUsersPerDay, getPostsPerDay } from './_lib/queries';

const searchParamsCache = createSearchParamsCache({
  from: parseAsString.withDefault(daysAgo(28)),
  to: parseAsString.withDefault(today()),
});

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { from: startDate, to: endDate } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const [newUsersData, postsData] = await Promise.all([
    getNewUsersPerDay(startDate, endDate),
    getPostsPerDay(startDate, endDate),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('dashboard')}</h1>

      {/* Date range picker */}
      <div className="mb-6">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          labels={{
            from: t('dashboardKpi.from'),
            to: t('dashboardKpi.to'),
            past7days: t('dashboardKpi.past7days'),
            past28days: t('dashboardKpi.past28days'),
            past90days: t('dashboardKpi.past90days'),
          }}
        />
      </div>

      {/* Period summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-secondary p-6">
          <p className="text-sm text-muted-foreground">{t('dashboardKpi.newUsersPeriodTotal')}</p>
          <p className="text-3xl font-semibold mt-1">{newUsersData.total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {startDate} ~ {endDate}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary p-6">
          <p className="text-sm text-muted-foreground">{t('dashboardKpi.postsPeriodTotal')}</p>
          <p className="text-3xl font-semibold mt-1">{postsData.total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {startDate} ~ {endDate}
          </p>
        </div>
      </div>

      {/* Daily trend chart */}
      <div className="rounded-lg border border-border bg-secondary p-6">
        <h2 className="text-lg font-semibold mb-4">{t('dashboardKpi.dailyTrends')}</h2>
        <DailyTrendChart
          newUsersData={newUsersData.daily}
          postsData={postsData.daily}
          labels={{
            newUsers: t('dashboardKpi.newUsers'),
            posts: t('dashboardKpi.posts'),
            noData: t('dashboardKpi.noData'),
          }}
        />
      </div>
    </div>
  );
}
