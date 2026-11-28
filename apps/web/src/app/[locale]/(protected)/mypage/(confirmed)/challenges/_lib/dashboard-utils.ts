/**
 * The dashboard's stats and chart helpers live in
 * `@blindfold-chess/features/challenge-records` so the mobile app's My
 * Records computes the same numbers; re-exported here for the web's imports.
 */
export {
  aggregateByDay,
  computeAbsoluteChange,
  computeStats,
  formatDate,
  formatShortDate,
  getDayIndex,
  getPeriodStart,
  getPreviousPeriodStart,
  isCompletedSession,
  type DailyAggregation,
} from '@blindfold-chess/features/challenge-records';
