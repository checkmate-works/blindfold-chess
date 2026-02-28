'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { PracticeMenuType } from '@/lib/db/practice-session-types';

import { SectionTitle } from '../../_components';
import {
  type DatePeriod,
  type PracticeSessionRow,
  getAvailableMenuTypes,
  getPracticeSessions,
} from '../_actions/get-practice-sessions';
import { ScoreChart } from './ScoreChart';
import { SessionHistoryTable } from './SessionHistoryTable';
import { StatsCard } from './StatsCard';

// 期間選択は意図的に固定期間のみ提供している。
// 理由: (1) 古いデータは練習の成長指標として参考にならない
// (2) 定期的なデータクリーンアップを想定しており、長期間のデータ保持を前提としない

const DATE_PERIODS: DatePeriod[] = ['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'];

function formatDate(date: Date | null, locale: string): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatShortDate(date: Date | null, locale: string): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

function getComparisonLabel(period: DatePeriod, t: ReturnType<typeof useTranslations>): string {
  switch (period) {
    case 'thisWeek':
      return t('vsLastWeek');
    case 'lastWeek':
      return t('vs2WeeksAgo');
    case 'thisMonth':
      return t('vsLastMonth');
    case 'lastMonth':
      return t('vs2MonthsAgo');
  }
}

/** 完走判定: incorrectAnswers < mistakeAllowance（3ミスに達せず時間切れで終了したセッション） */
function isCompletedSession(session: PracticeSessionRow): boolean {
  const mistakeAllowance = session.settings.mistakeAllowance;
  const incorrectAnswers = session.result.incorrectAnswers;
  if (typeof mistakeAllowance !== 'number' || typeof incorrectAnswers !== 'number') return false;
  return incorrectAnswers < mistakeAllowance;
}

function computeStats(sessions: PracticeSessionRow[]) {
  const scores = sessions
    .map((s) => {
      const correctAnswers = s.result.correctAnswers;
      return typeof correctAnswers === 'number' ? correctAnswers : null;
    })
    .filter((v): v is number => v !== null);

  const bestScore = scores.length > 0 ? Math.max(...scores) : null;

  const completedScores = sessions
    .filter(isCompletedSession)
    .map((s) => {
      const correctAnswers = s.result.correctAnswers;
      return typeof correctAnswers === 'number' ? correctAnswers : null;
    })
    .filter((v): v is number => v !== null);

  const avgCompletionScore =
    completedScores.length > 0
      ? completedScores.reduce((sum, v) => sum + v, 0) / completedScores.length
      : null;

  return { bestScore, avgCompletionScore, totalSessions: sessions.length };
}

function computePercentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

type DailyAggregation = {
  date: string;
  dateKey: string;
  avgScore: number;
};

function aggregateByDay(sessions: PracticeSessionRow[], locale: string): DailyAggregation[] {
  const dailyMap = new Map<string, { total: number; count: number; dateLabel: string }>();

  for (const s of sessions) {
    if (!s.startedAt) continue;
    const correctAnswers = s.result.correctAnswers;
    if (typeof correctAnswers !== 'number') continue;

    const d = new Date(s.startedAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.total += correctAnswers;
      existing.count += 1;
    } else {
      dailyMap.set(dateKey, {
        total: correctAnswers,
        count: 1,
        dateLabel: formatShortDate(s.startedAt, locale),
      });
    }
  }

  return Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, { total, count, dateLabel }]) => ({
      date: dateLabel,
      dateKey,
      avgScore: Math.round((total / count) * 10) / 10,
    }));
}

function getDayIndex(dateKey: string, periodStart: Date): number {
  const d = new Date(dateKey + 'T00:00:00');
  const diff = d.getTime() - periodStart.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPeriodStart(period: DatePeriod): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'thisWeek':
      return getMondayOfWeek(today);
    case 'lastWeek': {
      const thisMonday = getMondayOfWeek(today);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      return lastMonday;
    }
    case 'thisMonth':
      return new Date(today.getFullYear(), today.getMonth(), 1);
    case 'lastMonth':
      return new Date(today.getFullYear(), today.getMonth() - 1, 1);
  }
}

function getPreviousPeriodStart(period: DatePeriod): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'thisWeek': {
      const thisMonday = getMondayOfWeek(today);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      return lastMonday;
    }
    case 'lastWeek': {
      const thisMonday = getMondayOfWeek(today);
      const twoWeeksAgo = new Date(thisMonday);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return twoWeeksAgo;
    }
    case 'thisMonth':
      return new Date(today.getFullYear(), today.getMonth() - 1, 1);
    case 'lastMonth':
      return new Date(today.getFullYear(), today.getMonth() - 2, 1);
  }
}

export function Dashboard({ locale }: { locale: string }) {
  const t = useTranslations('Mypage');
  const [allSessions, setAllSessions] = useState<PracticeSessionRow[]>([]);
  const [previousSessions, setPreviousSessions] = useState<PracticeSessionRow[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<PracticeMenuType | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('thisWeek');
  const [isLoading, setIsLoading] = useState(true);
  const [availableMenuTypes, setAvailableMenuTypes] = useState<PracticeMenuType[]>([]);

  // Fetch all menu types once on mount to populate dropdown
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const types = await getAvailableMenuTypes();
      if (!cancelled && types.length > 0) {
        setAvailableMenuTypes(types);
        setSelectedMenu(types[0]);
      }
      if (!cancelled && types.length === 0) {
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch sessions when menu or period changes
  useEffect(() => {
    if (!selectedMenu) {
      setIsLoading(false);
      return;
    }

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

  const menuOptions = availableMenuTypes.map((type) => ({
    value: type,
    label: t(`menuTypes.${type}`),
  }));

  if (isLoading && availableMenuTypes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (availableMenuTypes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('noData')}</p>
      </div>
    );
  }

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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
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

function getPreviousPeriodLabel(period: DatePeriod): string {
  switch (period) {
    case 'thisWeek':
      return 'lastWeek';
    case 'lastWeek':
      return 'twoWeeksAgo';
    case 'thisMonth':
      return 'lastMonth';
    case 'lastMonth':
      return 'twoMonthsAgo';
  }
}
