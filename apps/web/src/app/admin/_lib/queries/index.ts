/**
 * Barrel for the admin dashboard queries. Preserves the pre-split public API
 * exactly so external imports (page, components, tests) do not need to change.
 */
export { aggregateByDay, fillDateRange, type DailyCount } from './aggregate-by-day';
export { fetchAllAuthUsers, getNewUsersPerDay } from './auth-users';
export { UGC_SOURCES, getPostsPerDay, type UgcSource } from './ugc-aggregation';
export { getKpiSummary, type KpiSummary, type UgcBreakdownRow } from './kpi-summary';
