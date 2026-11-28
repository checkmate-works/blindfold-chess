import type { DatePeriod } from "../utils/period-utils";

/**
 * The periods the dashboard offers, in order. Deliberately a few fixed
 * ranges: old data is not a useful reference point for measuring practice
 * progress, and old results are cleaned up periodically, so long-term
 * retention is not an assumption of the UI.
 */
export const DASHBOARD_PERIODS: readonly DatePeriod[] = [
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
];

/** The period the previous-period series and comparisons are taken from. */
export type PreviousPeriodLabel =
  "lastWeek" | "twoWeeksAgo" | "lastMonth" | "twoMonthsAgo";

/** The name of the period that `period`'s comparison is made against. */
export function getPreviousPeriodLabel(
  period: DatePeriod,
): PreviousPeriodLabel {
  switch (period) {
    case "thisWeek":
      return "lastWeek";
    case "lastWeek":
      return "twoWeeksAgo";
    case "thisMonth":
      return "lastMonth";
    case "lastMonth":
      return "twoMonthsAgo";
  }
}

/** The message key of the "vs …" caption under a stat (`vsLastWeek`, …). */
export type ComparisonLabelKey =
  "vsLastWeek" | "vs2WeeksAgo" | "vsLastMonth" | "vs2MonthsAgo";

export function getComparisonLabelKey(period: DatePeriod): ComparisonLabelKey {
  switch (period) {
    case "thisWeek":
      return "vsLastWeek";
    case "lastWeek":
      return "vs2WeeksAgo";
    case "thisMonth":
      return "vsLastMonth";
    case "lastMonth":
      return "vs2MonthsAgo";
  }
}

/**
 * The period that the previous-period legend label should navigate to, or
 * null if the previous period is not a selectable option.
 *
 * thisWeek  → lastWeek  (selectable)
 * thisMonth → lastMonth (selectable)
 * lastWeek  → null      ("2 weeks ago" is not selectable)
 * lastMonth → null      ("2 months ago" is not selectable)
 */
export function getNavigablePreviousPeriod(
  period: DatePeriod,
): DatePeriod | null {
  switch (period) {
    case "thisWeek":
      return "lastWeek";
    case "thisMonth":
      return "lastMonth";
    default:
      return null;
  }
}
