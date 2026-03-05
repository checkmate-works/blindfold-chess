'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { PracticeMenuType } from '@/lib/db/practice-session-types';

import { SectionTitle } from '@/app/[locale]/_components';

import {
  type DatePeriod,
  type PracticeSessionRow,
  getAvailableMenuTypes,
  getPracticeSessions,
} from '../_actions/get-practice-sessions';
import {
  aggregateByDay,
  computePercentChange,
  computeStats,
  formatDate,
  getComparisonLabel,
  getDayIndex,
  getPeriodStart,
  getPreviousPeriodLabel,
  getPreviousPeriodStart,
} from '../_lib/dashboard-utils';
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
  const [allSessions, setAllSessions] = useState<PracticeSessionRow[]>([]);
  const [previousSessions, setPreviousSessions] = useState<PracticeSessionRow[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<PracticeMenuType | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('thisWeek');
  const [isLoading, setIsLoading] = useState(true);
  const [availableMenuTypes, setAvailableMenuTypes] = useState<PracticeMenuType[] | null>(null);

  // Fetch all menu types once on mount to populate dropdown
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const types = await getAvailableMenuTypes();
      if (!cancelled) {
        setAvailableMenuTypes(types);
        if (types.length > 0) {
          setSelectedMenu(types[0]);
        } else {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch sessions when menu or period changes
  useEffect(() => {
    if (!selectedMenu) return;

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const response = await getPracticeSessions(selectedMenu, selectedPeriod);
      if (!cancelled && response.success) {
        setAllSessions(response.sessions);
        setPreviousSessions(response.previousSessions);
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMenu, selectedPeriod]);

  const currentStats = computeStats(allSessions);
  const prevStats = computeStats(previousSessions);

  const comparisonLabel = getComparisonLabel(selectedPeriod, t);

  const currentDaily = aggregateByDay(allSessions, locale);
  const previousDaily = aggregateByDay(previousSessions, locale);

  // Build chart data: map previous period onto current period's X axis
  const currentPeriodStart = getPeriodStart(selectedPeriod);
  const prevPeriodStart = getPreviousPeriodStart(selectedPeriod);

  const prevByDayIndex = new Map<number, number>();
  for (const pd of previousDaily) {
    const idx = getDayIndex(pd.dateKey, prevPeriodStart);
    prevByDayIndex.set(idx, pd.avgScore);
  }

  const chartData = currentDaily.map((cd) => {
    const dayIdx = getDayIndex(cd.dateKey, currentPeriodStart);
    const prevScore = prevByDayIndex.get(dayIdx) ?? null;
    return {
      date: cd.date,
      score: cd.avgScore,
      previousScore: prevScore,
    };
  });

  // TODO: ページネーション対応
  const tableRows = allSessions.slice(0, 20).map((s) => {
    const correctAnswers =
      typeof s.result.correctAnswers === 'number' ? s.result.correctAnswers : null;
    const incorrectAnswers =
      typeof s.result.incorrectAnswers === 'number' ? s.result.incorrectAnswers : null;
    const mistakeAllowance =
      typeof s.settings.mistakeAllowance === 'number' ? s.settings.mistakeAllowance : null;

    return {
      date: formatDate(s.startedAt, locale),
      correctAnswers: correctAnswers !== null ? `${correctAnswers}` : '-',
      incorrectAnswers,
      mistakeAllowance,
    };
  });

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
          className="w-full sm:w-64 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
          className="w-full sm:w-48 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {DATE_PERIODS.map((period) => (
            <option key={period} value={period}>
              {t(`periods.${period}`)}
            </option>
          ))}
        </select>
      </div>

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
                  percentChange: computePercentChange(currentStats.bestScore, prevStats.bestScore),
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
                  percentChange: computePercentChange(
                    currentStats.avgCompletionScore,
                    prevStats.avgCompletionScore
                  ),
                  absoluteChange: null,
                  label: comparisonLabel,
                }}
              />
              <StatsCard
                label={t('totalSessions')}
                value={currentStats.totalSessions.toString()}
                comparison={{
                  percentChange: null,
                  absoluteChange:
                    prevStats.totalSessions > 0
                      ? currentStats.totalSessions - prevStats.totalSessions
                      : null,
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
