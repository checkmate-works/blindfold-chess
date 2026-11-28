import {
  type DatePeriod,
  formatLocalIsoDate,
  getPeriodRange,
  getPreviousPeriodRange,
} from "../utils/period-utils";
import { type ChallengeRecord, formatShortDate } from "./records";

export type DailyAggregation = {
  date: string;
  dateKey: string;
  avgScore: number;
};

/** The average score of each local day that has runs, oldest first. */
export function aggregateByDay(
  sessions: ChallengeRecord[],
  locale: string,
): DailyAggregation[] {
  const dailyMap = new Map<
    string,
    { total: number; count: number; dateLabel: string }
  >();

  for (const s of sessions) {
    const d = new Date(s.createdAt);
    const dateKey = formatLocalIsoDate(d);
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

/**
 * Whole days from `periodStart` (local midnight) to the local date `dateKey`.
 *
 * Rounded, not floored: both instants are local midnights, so the difference
 * is a whole number of days except across a DST change, where one day is 23
 * or 25 hours long. Flooring turned every day after a spring-forward into
 * the day before it (6.96 → 6), so two days of the chart collapsed onto one
 * index and the later day's average overwrote the earlier one's. Rounding
 * absorbs the hour either way.
 */
export function getDayIndex(dateKey: string, periodStart: Date): number {
  const d = new Date(dateKey + "T00:00:00");
  const diff = d.getTime() - periodStart.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function getPeriodStart(period: DatePeriod): Date {
  return getPeriodRange(period).start;
}

export function getPreviousPeriodStart(period: DatePeriod): Date {
  return getPreviousPeriodRange(period).start;
}

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
function formatDayLabel(
  period: DatePeriod,
  periodStart: Date,
  dayIndex: number,
  locale: string,
) {
  const date = new Date(periodStart);
  date.setDate(date.getDate() + dayIndex);
  const options: Intl.DateTimeFormatOptions =
    period === "thisWeek" || period === "lastWeek"
      ? { weekday: "short" }
      : { day: "numeric" };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * The score-trend series of the dashboard: one point per day index (offset
 * from each period's start) holding that day's average score in the current
 * period and in the previous one. Days where only the previous period had
 * data are included with `score: null`.
 */
export function selectChartData(
  currentSessions: ChallengeRecord[],
  previousSessions: ChallengeRecord[],
  selectedPeriod: DatePeriod,
  locale: string,
): ChartDataPoint[] {
  const currentDaily = aggregateByDay(currentSessions, locale);
  const previousDaily = aggregateByDay(previousSessions, locale);

  const currentPeriodStart = getPeriodStart(selectedPeriod);
  const prevPeriodStart = getPreviousPeriodStart(selectedPeriod);

  const currentByDayIndex = new Map<number, number>();
  for (const cd of currentDaily) {
    currentByDayIndex.set(
      getDayIndex(cd.dateKey, currentPeriodStart),
      cd.avgScore,
    );
  }

  const prevByDayIndex = new Map<number, number>();
  for (const pd of previousDaily) {
    prevByDayIndex.set(getDayIndex(pd.dateKey, prevPeriodStart), pd.avgScore);
  }

  // Union of day indices from both periods so previous-only days also appear
  const allDayIndices = new Set([
    ...currentByDayIndex.keys(),
    ...prevByDayIndex.keys(),
  ]);
  const sortedIndices = Array.from(allDayIndices).sort((a, b) => a - b);

  return sortedIndices.map((dayIdx) => ({
    date: formatDayLabel(selectedPeriod, currentPeriodStart, dayIdx, locale),
    score: currentByDayIndex.get(dayIdx) ?? null,
    previousScore: prevByDayIndex.get(dayIdx) ?? null,
  }));
}
