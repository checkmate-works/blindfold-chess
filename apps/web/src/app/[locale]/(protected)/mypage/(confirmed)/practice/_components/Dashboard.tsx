'use client';

import { useTranslations } from 'next-intl';

import { PieceSelector } from '@/app/_components';

import type { PracticeMenuType } from '@/lib/db/practice-session-types';

import { SectionTitle } from '@/app/[locale]/_components';

import type { DatePeriod } from '../_actions/get-practice-sessions';
import {
  ORIENTATION_FILTER_MENUS,
  PIECE_FILTER_MENUS,
  useDashboardData,
} from '../_hooks/use-dashboard-data';
import { getComparisonLabel, getPreviousPeriodLabel } from '../_lib/dashboard-utils';
import { DashboardContentSkeleton, DashboardSkeleton } from './DashboardSkeleton';
import { ScoreChart } from './ScoreChart';
import { SessionHistoryTable } from './SessionHistoryTable';
import { StatsCard } from './StatsCard';

// 期間選択は意図的に固定期間のみ提供している。
// 理由: (1) 古いデータは練習の成長指標として参考にならない
// (2) 定期的なデータクリーンアップを想定しており、長期間のデータ保持を前提としない

const DATE_PERIODS: DatePeriod[] = ['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'];

const selectClassName =
  'px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring';

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
    currentStats,
    bestScoreComparison,
    avgScoreComparison,
    totalSessionsChange,
    chartData,
    tableRows,
  } = useDashboardData(locale);

  const comparisonLabel = getComparisonLabel(selectedPeriod, t);

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedMenu ?? ''}
          onChange={(e) => setSelectedMenu(e.target.value as PracticeMenuType)}
          className={`w-full sm:w-64 ${selectClassName}`}
        >
          {menuOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as DatePeriod)}
          className={`w-full sm:w-48 ${selectClassName}`}
        >
          {DATE_PERIODS.map((period) => (
            <option key={period} value={period}>
              {t(`periods.${period}`)}
            </option>
          ))}
        </select>
      </div>

      {selectedMenu && ORIENTATION_FILTER_MENUS.has(selectedMenu) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t('filters.boardOrientation')}
          </label>
          <select
            value={boardOrientationFilter}
            onChange={(e) => setBoardOrientationFilter(e.target.value)}
            className={`w-full sm:w-48 ${selectClassName}`}
          >
            {['all', 'white', 'black', 'random'].map((opt) => (
              <option key={opt} value={opt}>
                {t(`filters.${opt}`)}
              </option>
            ))}
          </select>
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
          <div>
            <SectionTitle>{t('records')}</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
              <StatsCard
                label={t('totalSessions')}
                value={currentStats.totalSessions.toString()}
                comparison={{
                  percentChange: null,
                  absoluteChange: totalSessionsChange,
                  label: comparisonLabel,
                }}
              />
            </div>
          </div>

          <div className="min-w-0">
            <SectionTitle>{t('scoreTrend')}</SectionTitle>
            <div className="mt-4">
              <ScoreChart
                data={chartData}
                emptyMessage={t('noData')}
                yAxisLabel={t('scoreUnit')}
                currentLabel={t(`periods.${selectedPeriod}`)}
                previousLabel={t(`periods.${getPreviousPeriodLabel(selectedPeriod)}`)}
              />
            </div>
          </div>

          <div>
            <SectionTitle>{t('sessionHistory')}</SectionTitle>
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
          </div>
        </>
      )}
    </div>
  );
}
