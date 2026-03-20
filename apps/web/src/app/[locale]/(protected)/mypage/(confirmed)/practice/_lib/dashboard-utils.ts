import { useTranslations } from 'next-intl';

import type { MISTAKE_LIMIT } from '@/lib/challenge-constants';

import type { ChallengeResultRow } from '../_actions/get-practice-sessions';
import type { DatePeriod } from './period-utils';
import { getPeriodRange, getPreviousPeriodRange } from './period-utils';

/**
 * 完走判定: incorrectAnswers < MISTAKE_LIMIT（ミス上限に達せず時間切れで終了したセッション）
 *
 * MISTAKE_LIMIT は @/lib/challenge-constants で一元管理されている。
 * ここでは型レベルでのみ参照し、実際の値は呼び出し側から渡す。
 */
export function isCompletedSession(
  session: ChallengeResultRow,
  mistakeLimit: typeof MISTAKE_LIMIT
): boolean {
  return session.incorrectAnswers < mistakeLimit;
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

export function computeStats(sessions: ChallengeResultRow[], mistakeLimit: number) {
  const scores = sessions.map((s) => s.score);

  const bestScore = scores.length > 0 ? Math.max(...scores) : null;

  const completedScores = sessions
    .filter((s) => s.incorrectAnswers < mistakeLimit)
    .map((s) => s.score);

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

export function aggregateByDay(sessions: ChallengeResultRow[], locale: string): DailyAggregation[] {
  const dailyMap = new Map<string, { total: number; count: number; dateLabel: string }>();

  for (const s of sessions) {
    const d = new Date(s.createdAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.total += s.score;
      existing.count += 1;
    } else {
      dailyMap.set(dateKey, {
        total: s.score,
        count: 1,
        dateLabel: formatShortDate(s.createdAt, locale),
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
