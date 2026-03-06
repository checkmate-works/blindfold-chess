import { useTranslations } from 'next-intl';

import type { PracticeSessionRow } from '@/lib/db/practice-session-types';
import { getSessionScoreFields } from '@/lib/db/practice-session-types';

import type { DatePeriod } from './period-utils';
import { getPeriodRange, getPreviousPeriodRange } from './period-utils';

/** 完走判定: incorrectAnswers < mistakeAllowance（3ミスに達せず時間切れで終了したセッション） */
export function isCompletedSession(session: PracticeSessionRow): boolean {
  const fields = getSessionScoreFields(session);
  if (!fields || fields.mistakeAllowance === null) return false;
  return fields.incorrectAnswers < fields.mistakeAllowance;
}

export function formatDate(date: Date | null, locale: string): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatShortDate(date: Date | null, locale: string): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function getComparisonLabel(
  period: DatePeriod,
  t: ReturnType<typeof useTranslations>
): string {
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

export function getPreviousPeriodLabel(period: DatePeriod): string {
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

export function computeStats(sessions: PracticeSessionRow[]) {
  const scores = sessions
    .map((s) => {
      const fields = getSessionScoreFields(s);
      return fields ? fields.correctAnswers : null;
    })
    .filter((v): v is number => v !== null);

  const bestScore = scores.length > 0 ? Math.max(...scores) : null;

  const completedScores = sessions
    .filter(isCompletedSession)
    .map((s) => {
      const fields = getSessionScoreFields(s);
      return fields ? fields.correctAnswers : null;
    })
    .filter((v): v is number => v !== null);

  const avgCompletionScore =
    completedScores.length > 0
      ? completedScores.reduce((sum, v) => sum + v, 0) / completedScores.length
      : null;

  return { bestScore, avgCompletionScore, totalSessions: sessions.length };
}

export function computePercentChange(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export type DailyAggregation = {
  date: string;
  dateKey: string;
  avgScore: number;
};

export function aggregateByDay(sessions: PracticeSessionRow[], locale: string): DailyAggregation[] {
  const dailyMap = new Map<string, { total: number; count: number; dateLabel: string }>();

  for (const s of sessions) {
    if (!s.startedAt) continue;
    const fields = getSessionScoreFields(s);
    if (!fields) continue;

    const d = new Date(s.startedAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.total += fields.correctAnswers;
      existing.count += 1;
    } else {
      dailyMap.set(dateKey, {
        total: fields.correctAnswers,
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

export function getDayIndex(dateKey: string, periodStart: Date): number {
  const d = new Date(dateKey + 'T00:00:00');
  const diff = d.getTime() - periodStart.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getPeriodStart(period: DatePeriod): Date {
  return getPeriodRange(period).start;
}

export function getPreviousPeriodStart(period: DatePeriod): Date {
  return getPreviousPeriodRange(period).start;
}
