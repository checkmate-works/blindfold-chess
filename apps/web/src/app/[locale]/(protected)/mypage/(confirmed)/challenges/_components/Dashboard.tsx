'use client';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardModule } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { buildChallengePath } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { SectionTitle } from '@/app/[locale]/_components';

import { useDashboardData } from '../_hooks/use-dashboard-data';
import {
  getComparisonLabel,
  getNavigablePreviousPeriod,
  getPreviousPeriodLabel,
} from '../_lib/dashboard-ui-utils';
import { DashboardFilters } from './DashboardFilters';
import { DashboardContentSkeleton, DashboardSkeleton } from './DashboardSkeleton';
import { DashboardStatsSection } from './DashboardStatsSection';
import { ScoreChart } from './ScoreChart';
import { SessionHistoryTable } from './SessionHistoryTable';

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

  if (availableMenuTypes === null || (isLoading && availableMenuTypes.length === 0)) {
    return <DashboardSkeleton />;
  }

  if (availableMenuTypes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('noData')}</p>
      </div>
    );
  }

  const menuOptions = availableMenuTypes.map((type) => ({
    value: type,
    label: t(`menuTypes.${type}`),
  }));

  return (
    <div className="space-y-6 overflow-x-hidden">
      <SectionTitle>{t('records')}</SectionTitle>

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

      {isLoading ? (
        <DashboardContentSkeleton />
      ) : (
        <>
          <DashboardStatsSection
            bestScore={currentStats.bestScore}
            avgCompletionScore={currentStats.avgCompletionScore}
            bestScoreComparison={bestScoreComparison}
            avgScoreComparison={avgScoreComparison}
            comparisonLabel={comparisonLabel}
          />

          <div className="min-w-0 overflow-hidden">
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

          <div>
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
                <Link
                  href="/mypage/challenges/results"
                  className="text-sm text-link-primary hover:text-link-primary/80 transition-colors"
                >
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
