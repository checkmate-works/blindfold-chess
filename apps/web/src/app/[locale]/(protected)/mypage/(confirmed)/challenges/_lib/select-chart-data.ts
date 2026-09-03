import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';
import {
  aggregateByDay,
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
 * X-axis label for the day at `dayIndex` of the selected period.
 *
 * The chart overlays the previous period on the current one by position
 * (Monday on Monday, the 5th on the 5th), so a point is a position in the
 * period, not a calendar date. Labels say so: weekday names for the week
 * periods, day-of-month for the month periods. Calendar dates were used
 * before, taken from the current period — which put "Sep 4" and "Sep 6" on
 * a "This Week" chart viewed on the 3rd, because those points came from
 * last week's Friday and Sunday. Both forms are locale-aware via `Intl`.
 */
function formatDayLabel(period: DatePeriod, periodStart: Date, dayIndex: number, locale: string) {
  const date = new Date(periodStart);
  date.setDate(date.getDate() + dayIndex);
  const options: Intl.DateTimeFormatOptions =
    period === 'thisWeek' || period === 'lastWeek' ? { weekday: 'short' } : { day: 'numeric' };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

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
  const currentByDayIndex = new Map<number, number>();
  for (const cd of currentDaily) {
    currentByDayIndex.set(getDayIndex(cd.dateKey, currentPeriodStart), cd.avgScore);
  }

  const prevByDayIndex = new Map<number, number>();
  for (const pd of previousDaily) {
    prevByDayIndex.set(getDayIndex(pd.dateKey, prevPeriodStart), pd.avgScore);
  }

  // Union of day indices from both periods so previous-only days also appear
  const allDayIndices = new Set([...currentByDayIndex.keys(), ...prevByDayIndex.keys()]);
  const sortedIndices = Array.from(allDayIndices).sort((a, b) => a - b);

  return sortedIndices.map((dayIdx) => ({
    date: formatDayLabel(selectedPeriod, currentPeriodStart, dayIdx, locale),
    score: currentByDayIndex.get(dayIdx) ?? null,
    previousScore: prevByDayIndex.get(dayIdx) ?? null,
  }));
}
