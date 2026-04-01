/**
 * Shared pagination utilities used across both public and admin pages.
 *
 * Two flavors are provided:
 *
 * 1. `paginateItems` — for in-memory arrays (re-exported from @blindfold-chess/features).
 * 2. `getPaginationParams` — for DB-level pagination (returns limit/offset for a query).
 */

export { type PaginatedResult, paginateItems } from '@blindfold-chess/features/utils';

/** Result of computing pagination parameters for a DB query. */
export type PaginationParams = {
  currentPage: number;
  totalPages: number;
  limit: number;
  offset: number;
};

/**
 * Compute limit/offset pagination parameters from a known total count.
 *
 * Clamps `requestedPage` to >= 1.
 */
export function getPaginationParams(
  requestedPage: number,
  totalCount: number,
  pageSize: number
): PaginationParams {
  const currentPage = Math.max(1, requestedPage);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const limit = pageSize;
  const offset = (currentPage - 1) * pageSize;

  return { currentPage, totalPages, limit, offset };
}
