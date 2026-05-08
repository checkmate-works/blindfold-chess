/**
 * Barrel for the admin dashboard queries. Preserves the pre-split public API
 * exactly so external imports (page, components, tests) do not need to change.
 */
export { aggregateByDay, fillDateRange, type DailyCount } from './aggregate-by-day';
export { getNewUsersPerDay } from './auth-users';
export { getPostsPerDay } from './ugc-aggregation';
export { getKpiSummary, type KpiSummary, type UgcBreakdownRow } from './kpi-summary';
