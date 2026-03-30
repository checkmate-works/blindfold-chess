'use client';

import { useTranslations } from 'next-intl';

import { PieceSelector } from '@/app/_components';
import { Link } from '@/i18n/routing';

import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

import type { LeaderboardModule } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { buildChallengePath } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/_components/BoardOrientationSelector';
import { SectionTitle } from '@/app/[locale]/_components';

import type { DatePeriod } from '../_actions/get-challenge-sessions';
import {
  ORIENTATION_FILTER_MENUS,
  PIECE_FILTER_MENUS,
  useDashboardData,
} from '../_hooks/use-dashboard-data';
import {
  getComparisonLabel,
  getNavigablePreviousPeriod,
  getPreviousPeriodLabel,
} from '../_lib/dashboard-utils';
import { selectClassName } from '../_lib/ui-constants';
import { DashboardContentSkeleton, DashboardSkeleton } from './DashboardSkeleton';
import { ScoreChart } from './ScoreChart';
import { SessionHistoryTable } from './SessionHistoryTable';
import { StatsCard } from './StatsCard';

// 期間選択は意図的に固定期間のみ提供している。
// 理由: (1) 古いデータは練習の成長指標として参考にならない
// (2) 定期的なデータクリーンアップを想定しており、長期間のデータ保持を前提としない

const DATE_PERIODS: DatePeriod[] = ['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'];

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

      <select
        value={selectedPeriod}
        onChange={(e) => setSelectedPeriod(e.target.value as DatePeriod)}
        className={`block w-full sm:w-48 ${selectClassName}`}
      >
        {DATE_PERIODS.map((period) => (
          <option key={period} value={period}>
            {t(`periods.${period}`)}
          </option>
        ))}
      </select>

      <select
        value={selectedMenu ?? ''}
        onChange={(e) => setSelectedMenu(e.target.value as ChallengeMenuType)}
        className={`block w-full sm:w-64 ${selectClassName}`}
      >
        {menuOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {selectedMenu && ORIENTATION_FILTER_MENUS.has(selectedMenu) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t('filters.boardOrientation')}
          </label>
          <BoardOrientationSelector
            value={boardOrientationFilter}
            onChange={setBoardOrientationFilter}
            labels={{
              title: t('filters.boardOrientation'),
              white: t('filters.white'),
              black: t('filters.black'),
              random: t('filters.random'),
            }}
            size="compact"
            hideLabel
            hideOptionLabels
          />
        </div>
      )}

      {selectedMenu && PIECE_FILTER_MENUS.has(selectedMenu) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t('filters.selectedPiece')}
          </label>
          <PieceSelector
            selected={pieceFilter}
            onSelect={handlePieceSelect}
            getLabel={(s) => t(`filters.pieces.${s}`)}
          />
        </div>
      )}

      {isLoading ? (
        <DashboardContentSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatsCard
              label={t('bestScore')}
              value={currentStats.bestScore !== null ? currentStats.bestScore.toString() : '-'}
              comparison={{
                percentChange: bestScoreComparison,
                absoluteChange: null,
                label: comparisonLabel,
              }}
            />
            <StatsCard
              label={t('avgScore')}
              value={
                currentStats.avgCompletionScore !== null
                  ? currentStats.avgCompletionScore.toFixed(1)
                  : '-'
              }
              tooltip={t('avgScoreTooltip')}
              comparison={{
                percentChange: avgScoreComparison,
                absoluteChange: null,
                label: comparisonLabel,
              }}
            />
          </div>

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
