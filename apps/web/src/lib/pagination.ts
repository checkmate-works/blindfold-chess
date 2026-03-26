/**
 * Shared pagination utilities used across both public and admin pages.
 *
 * Two flavors are provided:
 *
 * 1. `paginateItems` — for in-memory arrays (fetched all at once, sliced here).
 * 2. `getPaginationParams` — for DB-level pagination (returns limit/offset for a query).
 */

/** Result of paginating an in-memory array. */
export type PaginatedResult<T> = {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  paginatedItems: T[];
};

/**
 * Paginate an in-memory array.
 *
 * Clamps `requestedPage` to [1, totalPages].
 */
export function paginateItems<T>(
  items: T[],
  pageSize: number,
  requestedPage: number
): PaginatedResult<T> {
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = Math.max(1, Math.min(requestedPage, totalPages || 1));
  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return { totalCount, totalPages, currentPage, paginatedItems };
}

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
