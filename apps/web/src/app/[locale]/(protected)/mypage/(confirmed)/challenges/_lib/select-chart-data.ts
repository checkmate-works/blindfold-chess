import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';
import {
  aggregateByDay,
  formatShortDate,
  getDayIndex,
  getPeriodStart,
  getPreviousPeriodStart,
} from './dashboard-utils';
import type { DatePeriod } from './period-utils';

export type ChartDataPoint = {
  date: string;
  score: number | null;
  previousScore: number | null;
};

/**
 * Pure selector that computes the challenge-score line-chart series for the
 * mypage dashboard. Given a current-period session list, a previous-period
 * session list, the selected period bucket, and the user locale, it returns
 * one point per day index (offset from each period's start). Days where only
 * the previous period had data are included with `score: null`.
 *
 * This is deliberately a pure function (no React) so it can be unit-tested
 * and shared by non-hook callers.
 */
export function selectChartData(
  currentSessions: ChallengeResultRow[],
  previousSessions: ChallengeResultRow[],
  selectedPeriod: DatePeriod,
  locale: string
): ChartDataPoint[] {
  const currentDaily = aggregateByDay(currentSessions, locale);
  const previousDaily = aggregateByDay(previousSessions, locale);

  const currentPeriodStart = getPeriodStart(selectedPeriod);
  const prevPeriodStart = getPreviousPeriodStart(selectedPeriod);

  // Build maps keyed by day index (offset from period start)
  const currentByDayIndex = new Map<number, { avgScore: number; dateLabel: string }>();
  for (const cd of currentDaily) {
    const idx = getDayIndex(cd.dateKey, currentPeriodStart);
    currentByDayIndex.set(idx, { avgScore: cd.avgScore, dateLabel: cd.date });
  }

  const prevByDayIndex = new Map<number, number>();
  for (const pd of previousDaily) {
    const idx = getDayIndex(pd.dateKey, prevPeriodStart);
    prevByDayIndex.set(idx, pd.avgScore);
  }

  // Union of day indices from both periods so previous-only days also appear
  const allDayIndices = new Set([...currentByDayIndex.keys(), ...prevByDayIndex.keys()]);
  const sortedIndices = Array.from(allDayIndices).sort((a, b) => a - b);

  return sortedIndices.map((dayIdx) => {
    const current = currentByDayIndex.get(dayIdx);
    const prevScore = prevByDayIndex.get(dayIdx) ?? null;

    let dateLabel: string;
    if (current) {
      dateLabel = current.dateLabel;
    } else {
      const dateForLabel = new Date(currentPeriodStart);
      dateForLabel.setDate(dateForLabel.getDate() + dayIdx);
      dateLabel = formatShortDate(dateForLabel, locale);
    }

    return {
      date: dateLabel,
      score: current?.avgScore ?? null,
      previousScore: prevScore,
    };
  });
}
