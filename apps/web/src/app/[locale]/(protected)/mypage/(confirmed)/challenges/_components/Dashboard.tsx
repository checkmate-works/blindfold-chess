'use client';

import dynamic from 'next/dynamic';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardModule } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { buildChallengePath } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { SectionTitle } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { useDashboardData } from '../_hooks/use-dashboard-data';
import {
  getComparisonLabel,
  getNavigablePreviousPeriod,
  getPreviousPeriodLabel,
} from '../_lib/dashboard-ui-utils';
import { DashboardFilters } from './DashboardFilters';
import {
  DashboardContentSkeleton,
  DashboardSkeleton,
  ScoreChartSkeleton,
} from './DashboardSkeleton';
import { DashboardStatsSection } from './DashboardStatsSection';
import { SessionHistoryTable } from './SessionHistoryTable';

const ScoreChart = dynamic(() => import('./ScoreChart').then((mod) => mod.ScoreChart), {
  ssr: false,
  loading: () => <ScoreChartSkeleton />,
});

export function Dashboard({ locale }: { locale: string }) {
  const t = useTranslations('Mypage');
  const {
    selectedMenu,
    setSelectedMenu,
    selectedPeriod,
    setSelectedPeriod,
    boardOrientationFilter,
    setBoardOrientationFilter,
    pieceFilter,
    handlePieceSelect,
    isLoading,
    availableMenuTypes,
    activePiece,
    currentStats,
    bestScoreComparison,
    avgScoreComparison,
    chartData,
    tableRows,
    hasMoreResults,
  } = useDashboardData(locale);

  const comparisonLabel = getComparisonLabel(selectedPeriod, t);
  const navigablePrevPeriod = getNavigablePreviousPeriod(selectedPeriod);

  // Only the very first load (before we know anything) shows the full-page
  // skeleton. Once `availableMenuTypes` is an array we always render the
  // period selector so the user can switch periods — even a period with no
  // records must remain escapable (otherwise selecting an empty period would
  // hide the period select and trap the user).
  if (availableMenuTypes === null) {
    return <DashboardSkeleton />;
  }

  const menuOptions = availableMenuTypes.map((type) => ({
    value: type,
    label: t(`menuTypes.${type}`),
  }));

  return (
    <div className="space-y-6 overflow-x-hidden">
      <SectionTitle>{t('records')}</SectionTitle>

      <div data-tour-id="challenges-filters" className="space-y-6">
        <DashboardFilters
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          selectedMenu={selectedMenu}
          setSelectedMenu={setSelectedMenu}
          menuOptions={menuOptions}
          boardOrientationFilter={boardOrientationFilter}
          setBoardOrientationFilter={setBoardOrientationFilter}
          pieceFilter={pieceFilter}
          handlePieceSelect={handlePieceSelect}
        />
      </div>

      {isLoading ? (
        <DashboardContentSkeleton />
      ) : availableMenuTypes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t('noData')}</p>
          <Link
            href="/practice"
            locale={locale}
            className="mt-4 inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('goToPractice')}
          </Link>
        </div>
      ) : (
        <>
          <div data-tour-id="challenges-stats">
            <DashboardStatsSection
              bestScore={currentStats.bestScore}
              avgCompletionScore={currentStats.avgCompletionScore}
              bestScoreComparison={bestScoreComparison}
              avgScoreComparison={avgScoreComparison}
              comparisonLabel={comparisonLabel}
            />
          </div>

          <div data-tour-id="challenges-chart" className="min-w-0 overflow-hidden">
            <h3 className="text-sm md:text-base font-medium text-muted-foreground">
              {t('scoreTrend')}
            </h3>
            <div className="mt-4">
              <ScoreChart
                data={chartData}
                emptyMessage={t('noData')}
                yAxisLabel={t('scoreUnit')}
                currentLabel={t(`periods.${selectedPeriod}`)}
                previousLabel={t(`periods.${getPreviousPeriodLabel(selectedPeriod)}`)}
                onPreviousLabelClick={
                  navigablePrevPeriod ? () => setSelectedPeriod(navigablePrevPeriod) : undefined
                }
              />
            </div>
          </div>

          <div data-tour-id="challenges-history">
            <h3 className="text-sm md:text-base font-medium text-muted-foreground">
              {t('sessionHistory')}
            </h3>
            <div className="mt-4">
              <SessionHistoryTable
                sessions={tableRows}
                emptyMessage={t('noData')}
                headers={{
                  date: t('tableDate'),
                  correctAnswers: t('tableCorrectAnswers'),
                  incorrectAnswers: t('tableIncorrectAnswers'),
                }}
              />
            </div>
            {hasMoreResults && (
              <div className="text-center mt-3">
                <Link href="/mypage/challenges/results" className={`text-sm ${TEXT_LINK_CLASSES}`}>
                  {t('viewAllResults')}
                </Link>
              </div>
            )}
          </div>

          {selectedMenu && (
            <div className="flex justify-center py-4">
              <Link
                href={buildChallengePath(
                  selectedMenu as LeaderboardModule,
                  selectedMenu === 'coordinate_quiz'
                    ? boardOrientationFilter
                    : selectedMenu === 'legal_moves'
                      ? activePiece
                      : 'default'
                )}
                locale={locale}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t('practiceThisChallenge')}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
