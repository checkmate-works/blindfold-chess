import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsString } from 'nuqs/server';

import { DailyTrendChart } from './_components/DailyTrendChart';
import { DateRangePicker } from './_components/DateRangePicker';
import { KpiSummaryTable } from './_components/KpiSummaryTable';
import { daysAgo, today } from './_lib/date-utils';
import { getKpiSummary, getNewUsersPerDay, getPostsPerDay } from './_lib/queries';

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

  const kpiSummary = await getKpiSummary({
    startDate,
    endDate,
    usersTotalInPeriod: newUsersData.total,
    ugcTotalInPeriod: postsData.total,
  });

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
            {startDate} ~ {endDate} (UTC)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary p-6">
          <p className="text-sm text-muted-foreground">{t('dashboardKpi.ugcPostsPeriodTotal')}</p>
          <p className="text-3xl font-semibold mt-1">{postsData.total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {startDate} ~ {endDate} (UTC)
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
            posts: t('dashboardKpi.ugcPosts'),
            noData: t('dashboardKpi.noData'),
          }}
        />
      </div>

      {/* KPI summary table */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">{t('dashboardKpi.summaryTable.title')}</h2>
        <KpiSummaryTable
          data={kpiSummary}
          labels={{
            category: t('dashboardKpi.summaryTable.category'),
            metric: t('dashboardKpi.summaryTable.metric'),
            value: t('dashboardKpi.summaryTable.value'),
            users: t('dashboardKpi.summaryTable.users'),
            ugcPosts: t('dashboardKpi.summaryTable.ugcPosts'),
            likes: t('dashboardKpi.summaryTable.likes'),
            avgPerDay: t('dashboardKpi.summaryTable.avgPerDay'),
            avgPerActivePoster: t('dashboardKpi.summaryTable.avgPerActivePoster'),
            total: t('dashboardKpi.summaryTable.total'),
            sourceLabels: {
              topic_posts: t('dashboardKpi.summaryTable.sources.topic_posts'),
              positions: t('dashboardKpi.summaryTable.sources.positions'),
            },
            breakdownLabels: {
              'topic_posts.opening': t('dashboardKpi.summaryTable.breakdowns.topic_posts.opening'),
              'topic_posts.square': t('dashboardKpi.summaryTable.breakdowns.topic_posts.square'),
              'positions.memory': t('dashboardKpi.summaryTable.breakdowns.positions.memory'),
            },
          }}
        />
      </div>
    </div>
  );
}
