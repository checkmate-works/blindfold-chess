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
  requestedPage: number,
): PaginatedResult<T> {
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = Math.max(1, Math.min(requestedPage, totalPages || 1));
  const paginatedItems = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return { totalCount, totalPages, currentPage, paginatedItems };
}
